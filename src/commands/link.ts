import { dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { CANONICAL_SKILLS_DIR, SKILL_LOCK_PATH, agentRegistry, getAgentGlobalPath, type AgentId } from '../agents.js';
import { CliError } from '../errors.js';
import { getLastSelectedAgents } from '../lockfile.js';
import { createSkillSymlinks, listCanonicalSkills } from '../linker.js';
import * as p from '@clack/prompts';

export async function linkCommand(options: { agents?: string[] }): Promise<void> {
  p.intro('skills-manager link');

  // 1. Read lock file for lastSelectedAgents
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
    agents = await getLastSelectedAgents(SKILL_LOCK_PATH);
    if (agents.length === 0) {
      p.cancel('No lastSelectedAgents found in .skill-lock.json. Use --agents to specify.');
      throw new CliError('No lastSelectedAgents found in .skill-lock.json.');
    }
  }

  // 2. Interactive confirmation
  const agentChoices = agents.map(id => {
    const globalPath = getAgentGlobalPath(id);
    const dirExists = existsSync(globalPath) || existsSync(dirname(globalPath));
    return {
      value: id as string,
      label: `${agentRegistry[id].displayName} (${id})`,
      hint: dirExists ? globalPath : `${globalPath} — directory will be created`,
    };
  });

  const selected = await p.multiselect<string>({
    message: 'Select agents to link skills to:',
    options: agentChoices,
    initialValues: agents as string[],
    required: false,
  });

  if (p.isCancel(selected) || !selected.length) {
    p.cancel('No agents selected.');
    return;
  }

  // 3. Get skill list
  const skills = await listCanonicalSkills(CANONICAL_SKILLS_DIR);
  if (skills.length === 0) {
    p.cancel(`No skills found in ${CANONICAL_SKILLS_DIR}.`);
    throw new CliError(`No skills found in ${CANONICAL_SKILLS_DIR}.`);
  }

  // 4. Create symlinks for each agent
  const linkedAgents: string[] = [];
  const skippedAgents: { id: string; reason: string }[] = [];

  for (const agentId of selected as AgentId[]) {
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
      spinner.stop(`${agentRegistry[agentId].displayName}: failed`);
      skippedAgents.push({ id: agentId, reason: String(err) });
    }
  }

  // 5. Summary
  p.note(
    [
      linkedAgents.length > 0 ? `✓ Linked: ${linkedAgents.join(', ')}` : '',
      skippedAgents.length > 0 ? `✗ Skipped: ${skippedAgents.map(s => `${s.id} (${s.reason})`).join(', ')}` : '',
    ].filter(Boolean).join('\n'),
    'Summary',
  );

  p.outro('Done!');
}
