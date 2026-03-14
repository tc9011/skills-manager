import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_SKILLS_DIR, SKILL_LOCK_PATH, agentRegistry, getAgentGlobalPath, groupAgentsByProjectPath, type AgentId } from '../agents.js';
import { CliError } from '../errors.js';
import { readConfig, writeConfig } from '../config.js';
import { getLastSelectedAgents } from '../lockfile.js';
import { createSkillSymlinks, listCanonicalSkills, copySkills, createProjectSymlinks } from '../linker.js';
import * as p from '@clack/prompts';

export async function linkCommand(options: { agents?: string[]; project?: boolean; skills?: string[]; mode?: string }): Promise<void> {
  p.intro('skills-manager link');

  // 1. Resolve agents: --agents flag takes precedence, otherwise use full registry
  //    Lock file agents are used for pre-selection only.
  let agents: AgentId[];
  if (options.agents?.length) {
    const validIds = new Set(Object.keys(agentRegistry));
    const invalid = options.agents.filter(id => !validIds.has(id));
    if (invalid.length > 0) {
      p.cancel(`Unknown agent ID(s): ${invalid.join(', ')}. Run with no --agents to see available IDs.`);
      throw new CliError(`Unknown agent ID(s): ${invalid.join(', ')}`);
    }
    agents = options.agents as AgentId[];
  } else {
    agents = Object.keys(agentRegistry) as AgentId[];
  }

  // Read lock file agents for pre-selection
  const lockFileAgents = await getLastSelectedAgents(SKILL_LOCK_PATH);

  // 2. Get skill list
  const skills = await listCanonicalSkills(CANONICAL_SKILLS_DIR);
  if (skills.length === 0) {
    p.cancel(`No skills found in ${CANONICAL_SKILLS_DIR}.`);
    throw new CliError(`No skills found in ${CANONICAL_SKILLS_DIR}.`);
  }

  // 3. Link/copy skills
  const linkedAgents: string[] = [];
  const skippedAgents: { id: string; reason: string }[] = [];

  if (options.project) {
    // Project mode prompt order: skills → copy/symlink → agents

    // 3a. Select skills — skip prompt if --skills provided
    let selectedSkills: string[];
    if (options.skills?.length) {
      const skillSet = new Set(skills);
      const invalid = options.skills.filter(s => !skillSet.has(s));
      if (invalid.length > 0) {
        p.cancel(`Unknown skill(s): ${invalid.join(', ')}. Available: ${skills.join(', ')}`);
        throw new CliError(`Unknown skill(s): ${invalid.join(', ')}`);
      }
      selectedSkills = options.skills;
    } else {
      const skillChoices = skills.map(name => ({
        value: name,
        label: name,
      }));

      const pickedSkills = await p.multiselect<string>({
        message: 'Select skills to link:',
        options: skillChoices,
        required: false,
      });

      if (p.isCancel(pickedSkills) || !pickedSkills.length) {
        p.cancel('No skills selected.');
        return;
      }

      selectedSkills = pickedSkills as string[];
    }

    // 3b. Select copy vs symlink — skip prompt if --mode provided
    let mode: string;
    if (options.mode) {
      if (options.mode !== 'copy' && options.mode !== 'symlink') {
        p.cancel(`Invalid mode '${options.mode}'. Must be 'copy' or 'symlink'.`);
        throw new CliError(`Invalid mode '${options.mode}'. Must be 'copy' or 'symlink'.`);
      }
      mode = options.mode;
    } else {
      const modeResult = await p.select({
        message: 'How should skills be added to the project?',
        options: [
          { value: 'copy', label: 'Copy files', hint: 'recommended — independent copies' },
          { value: 'symlink', label: 'Create symlinks', hint: 'links to ~/.agents/skills' },
        ],
        initialValue: 'copy',
      });

      if (p.isCancel(modeResult)) {
        p.cancel('Cancelled.');
        return;
      }
      mode = modeResult as string;
    }

    // 3c. Select agents — skip prompt if --agents provided
    let selectedAgents: AgentId[];
    if (options.agents?.length) {
      selectedAgents = agents;
    } else {
      const agentChoices = agents.map(id => {
        const projectPath = agentRegistry[id].projectPath;
        const targetDir = join(process.cwd(), projectPath);
        const dirExists = existsSync(targetDir);
        return {
          value: id as string,
          label: `${agentRegistry[id].displayName} (${id})`,
          hint: dirExists ? projectPath : `${projectPath} — directory will be created`,
        };
      });

      const selected = await p.multiselect<string>({
        message: 'Select agents to link skills to:',
        options: agentChoices,
        initialValues: computeInitialValues(agentChoices, lockFileAgents),
        required: false,
      });

      if (p.isCancel(selected) || !selected.length) {
        p.cancel('No agents selected.');
        return;
      }

      const validSelected = new Set(Object.keys(agentRegistry));
      selectedAgents = (selected as string[]).filter(
        (id): id is AgentId => validSelected.has(id)
      );
    }

    // 3d. Execute: group by projectPath, copy/link
    const groups = groupAgentsByProjectPath(selectedAgents);

    for (const [projectPath, groupAgentIds] of groups) {
      const targetDir = join(process.cwd(), projectPath);
      const agentNames = groupAgentIds.map(id => agentRegistry[id].displayName).join(', ');
      const spinner = p.spinner();
      spinner.start(`${mode === 'copy' ? 'Copying' : 'Linking'} to ${projectPath} (${agentNames})...`);

      try {
        if (mode === 'copy') {
          const results = await copySkills(CANONICAL_SKILLS_DIR, targetDir, selectedSkills);
          const copied = results.filter(r => r.status === 'copied').length;
          const overwritten = results.filter(r => r.status === 'overwritten').length;
          const skipped = results.filter(r => r.status === 'skipped').length;
          const parts = [`${copied} copied`];
          if (overwritten > 0) parts.push(`${overwritten} overwritten`);
          parts.push(`${skipped} skipped`);
          spinner.stop(`${projectPath}: ${parts.join(', ')}`);
        } else {
          const results = await createProjectSymlinks(CANONICAL_SKILLS_DIR, targetDir, selectedSkills);
          const created = results.filter(r => r.status === 'created').length;
          const recreated = results.filter(r => r.status === 'recreated').length;
          const existed = results.filter(r => r.status === 'exists').length;
          const skipped = results.filter(r => r.status === 'skipped').length;
          const parts = [`${created} linked`];
          if (recreated > 0) parts.push(`${recreated} recreated`);
          parts.push(`${existed} existing`, `${skipped} skipped`);
          spinner.stop(`${projectPath}: ${parts.join(', ')}`);
        }
        linkedAgents.push(...groupAgentIds);
      } catch (err) {
        spinner.error(`${projectPath}: failed`);
        for (const id of groupAgentIds) {
          skippedAgents.push({ id, reason: String(err) });
        }
      }
    }

    // Save selection for next time
    if (linkedAgents.length > 0) {
      writeConfig({ lastLinkedAgents: selectedAgents });
    }
  } else {
    // Global mode: agents → link all skills

    // 3a. Select agents — skip prompt if --agents provided
    let selectedAgents: AgentId[];
    if (options.agents?.length) {
      selectedAgents = agents;
    } else {
      const agentChoices = agents.map(id => {
        const globalPath = getAgentGlobalPath(id);
        const dirExists = existsSync(globalPath);
        return {
          value: id as string,
          label: `${agentRegistry[id].displayName} (${id})`,
          hint: dirExists ? globalPath : `${globalPath} — directory will be created`,
        };
      });

      const selected = await p.multiselect<string>({
        message: 'Select agents to link skills to:',
        options: agentChoices,
        initialValues: computeInitialValues(agentChoices, lockFileAgents),
        required: false,
      });

      if (p.isCancel(selected) || !selected.length) {
        p.cancel('No agents selected.');
        return;
      }

      const validSelected = new Set(Object.keys(agentRegistry));
      selectedAgents = (selected as string[]).filter(
        (id): id is AgentId => validSelected.has(id)
      );
    }

    // 3b. Link all skills for each agent
    for (const agentId of selectedAgents) {
      const globalPath = getAgentGlobalPath(agentId);
      const spinner = p.spinner();
      spinner.start(`Linking ${agentRegistry[agentId].displayName}...`);

      try {
        const results = await createSkillSymlinks(CANONICAL_SKILLS_DIR, globalPath, skills);
        const created = results.filter(r => r.status === 'created').length;
        const recreated = results.filter(r => r.status === 'recreated').length;
        const existed = results.filter(r => r.status === 'exists').length;
        const skipped = results.filter(r => r.status === 'skipped').length;

        const parts = [`${created} linked`];
        if (recreated > 0) parts.push(`${recreated} recreated`);
        parts.push(`${existed} existing`, `${skipped} skipped`);
        spinner.stop(`${agentRegistry[agentId].displayName}: ${parts.join(', ')}`);
        linkedAgents.push(agentId);
      } catch (err) {
        spinner.error(`${agentRegistry[agentId].displayName}: failed`);
        skippedAgents.push({ id: agentId, reason: String(err) });
      }
    }

    // Save selection for next time
    if (linkedAgents.length > 0) {
      writeConfig({ lastLinkedAgents: selectedAgents });
    }
  }

  // Summary
  p.note(
    [
      linkedAgents.length > 0 ? `✓ Linked: ${linkedAgents.join(', ')}` : '',
      skippedAgents.length > 0 ? `✗ Skipped: ${skippedAgents.map(s => `${s.id} (${s.reason})`).join(', ')}` : '',
    ].filter(Boolean).join('\n'),
    'Summary',
  );

  p.outro('Done!');
}

function computeInitialValues(choices: { value: string }[], lockFileAgents: AgentId[]): string[] {
  const config = readConfig();
  const saved = config.lastLinkedAgents;
  if (saved && saved.length > 0) {
    const choiceSet = new Set(choices.map(c => c.value));
    const matching = saved.filter(id => choiceSet.has(id));
    if (matching.length > 0) {
      return matching;
    }
  }
  if (lockFileAgents.length > 0) {
    const choiceSet = new Set(choices.map(c => c.value));
    return lockFileAgents.filter(id => choiceSet.has(id as string)) as string[];
  }
  return choices.filter(c => existsSync(getAgentGlobalPath(c.value as AgentId))).map(c => c.value);
}
