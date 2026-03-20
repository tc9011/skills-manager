import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CliError } from '../errors.js';
import type { AgentId } from '../agents.js';
import { getLastSelectedAgents } from '../lockfile.js';
import { readConfig, writeConfig } from '../config.js';
import { createSkillSymlinks, listCanonicalSkills, copySkills, createProjectSymlinks } from '../linker.js';
import * as prompts from '@clack/prompts';
import * as searchMultiselectModule from '../prompts/search-multiselect.js';

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  cancel: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  spinner: () => ({ start: vi.fn(), stop: vi.fn(), error: vi.fn() }),
  multiselect: vi.fn(),
  select: vi.fn(),
  isCancel: vi.fn(() => false),
}));

vi.mock('../prompts/search-multiselect.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../prompts/search-multiselect.js')>();
  return {
    searchMultiselect: vi.fn(),
    cancelSymbol: original.cancelSymbol,
  };
});

vi.mock('../lockfile.js', () => ({
  getLastSelectedAgents: vi.fn(),
}));

vi.mock('../linker.js', () => ({
  createSkillSymlinks: vi.fn(),
  listCanonicalSkills: vi.fn(),
  copySkills: vi.fn(),
  createProjectSymlinks: vi.fn(),
}));
vi.mock('../config.js', () => ({
  readConfig: vi.fn(() => ({})),
  writeConfig: vi.fn(),
}));


vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return { ...actual, existsSync: vi.fn(() => true) };
});

describe('linkCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('throws CliError for invalid agent IDs', async () => {
    const { linkCommand } = await import('./link.js');
    await expect(
      linkCommand({ agents: ['not-a-real-agent-id'] }),
    ).rejects.toThrow(CliError);
  });

  it('throws CliError with message listing invalid IDs', async () => {
    const { linkCommand } = await import('./link.js');
    await expect(
      linkCommand({ agents: ['bogus-agent', 'also-fake'] }),
    ).rejects.toThrow(/bogus-agent.*also-fake|also-fake.*bogus-agent/);
  });

  it('module exports a linkCommand function', async () => {
    const mod = await import('./link.js');
    expect(typeof mod.linkCommand).toBe('function');
  });

  it('shows all registered agents even when lock file is empty', async () => {
    vi.mocked(getLastSelectedAgents).mockResolvedValue([]);
    vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['cursor']);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockResolvedValue([
      { skill: 'my-skill', status: 'created' },
    ]);

    const { linkCommand } = await import('./link.js');
    await linkCommand({});

    const call = vi.mocked(searchMultiselectModule.searchMultiselect).mock.calls[0][0] as { items: Array<{ value: string }> };
    expect(call.items.length).toBeGreaterThan(10);
    expect(call.items.some(o => o.value === 'openclaw')).toBe(true);
  });

  it('pre-selects lock file agents when no lastLinkedAgents saved', async () => {
    vi.mocked(readConfig).mockReturnValue({});
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['claude-code', 'windsurf'] as AgentId[]);
    vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['claude-code', 'windsurf']);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockResolvedValue([
      { skill: 'my-skill', status: 'created' },
    ]);

    const { linkCommand } = await import('./link.js');
    await linkCommand({});

    const call = vi.mocked(searchMultiselectModule.searchMultiselect).mock.calls[0][0] as { initialSelected?: string[] };
    expect(call.initialSelected).toEqual(expect.arrayContaining(['claude-code', 'windsurf']));
  });

  it('pre-selects lastLinkedAgents over lock file agents', async () => {
    vi.mocked(readConfig).mockReturnValue({ lastLinkedAgents: ['claude-code'] });
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor', 'opencode'] as AgentId[]);
    vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['claude-code']);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockResolvedValue([
      { skill: 'my-skill', status: 'created' },
    ]);

    const { linkCommand } = await import('./link.js');
    await linkCommand({});

    const call = vi.mocked(searchMultiselectModule.searchMultiselect).mock.calls[0][0] as { initialSelected?: string[] };
    expect(call.initialSelected).toEqual(['claude-code']);
  });

  it('links skills to agents on happy path', async () => {
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
    vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['cursor']);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockResolvedValue([
      { skill: 'my-skill', status: 'created' },
    ]);

    const { linkCommand } = await import('./link.js');
    await linkCommand({});

    expect(getLastSelectedAgents).toHaveBeenCalledOnce();
    expect(createSkillSymlinks).toHaveBeenCalledOnce();
    expect(vi.mocked(createSkillSymlinks).mock.calls[0][2]).toEqual(['my-skill']);
  });

  it('saves selected agents to config after successful link', async () => {
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor', 'opencode'] as AgentId[]);
    vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['cursor']);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockResolvedValue([
      { skill: 'my-skill', status: 'created' },
    ]);

    const { linkCommand } = await import('./link.js');
    await linkCommand({});

    expect(writeConfig).toHaveBeenCalledWith({
      lastLinkedAgents: ['cursor'],
    });
  });

  it('throws CliError when no skills found in canonical dir', async () => {
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
    vi.mocked(listCanonicalSkills).mockResolvedValue([]);

    const { linkCommand } = await import('./link.js');
    await expect(linkCommand({})).rejects.toThrow(CliError);
  });

  it('returns gracefully when user cancels multiselect', async () => {
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(searchMultiselectModule.cancelSymbol);

    const { linkCommand } = await import('./link.js');
    // Should not throw — just returns after cancel
    await linkCommand({});

    expect(prompts.cancel).toHaveBeenCalledWith('No agents selected.');
    expect(createSkillSymlinks).not.toHaveBeenCalled();
  });

  it('handles agent symlink creation failure in summary', async () => {
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
    vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['cursor']);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockRejectedValue(new Error('permission denied'));

    const { linkCommand } = await import('./link.js');
    await linkCommand({});

    // Should show summary with skipped agent, not throw
    expect(prompts.note).toHaveBeenCalled();
  });

  it('uses saved lastLinkedAgents for initial selection', async () => {
    vi.mocked(readConfig).mockReturnValue({ lastLinkedAgents: ['opencode'] });
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor', 'opencode'] as AgentId[]);
    vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['opencode']);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockResolvedValue([
      { skill: 'my-skill', status: 'created' },
    ]);

    const { linkCommand } = await import('./link.js');
    await linkCommand({});

    // searchMultiselect should be called with initialSelected from saved config
    // opencode is universal, so it won't appear in initialSelected (universal agents are locked)
    const call = vi.mocked(searchMultiselectModule.searchMultiselect).mock.calls[0][0] as { initialSelected?: string[] };
    expect(call.initialSelected).toEqual([]);
  });

  describe('project mode', () => {
    // New prompt order: skills → copy/symlink → agents

    it('calls copySkills when project mode with copy (default)', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked(prompts.multiselect).mockResolvedValueOnce(['my-skill']);
      vi.mocked(prompts.select).mockResolvedValue('copy');
      vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['cursor']);
      vi.mocked(copySkills).mockResolvedValue([
        { skill: 'my-skill', status: 'copied' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true });

      expect(copySkills).toHaveBeenCalledOnce();
      expect(createProjectSymlinks).not.toHaveBeenCalled();
      expect(createSkillSymlinks).not.toHaveBeenCalled();
      // Verify only selected skills are passed
      const callArgs = vi.mocked(copySkills).mock.calls[0];
      expect(callArgs[2]).toEqual(['my-skill']);
    });

    it('calls createProjectSymlinks when project mode with symlink', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked(prompts.multiselect).mockResolvedValueOnce(['my-skill']);
      vi.mocked(prompts.select).mockResolvedValue('symlink');
      vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['cursor']);
      vi.mocked(createProjectSymlinks).mockResolvedValue([
        { skill: 'my-skill', status: 'created' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true });

      expect(createProjectSymlinks).toHaveBeenCalledOnce();
      expect(copySkills).not.toHaveBeenCalled();
      expect(createSkillSymlinks).not.toHaveBeenCalled();
    });

    it('deduplicates universal agents sharing same projectPath', async () => {
      // opencode and amp are both universal → share '.agents/skills' projectPath
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['opencode', 'amp'] as AgentId[]);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked(prompts.multiselect).mockResolvedValueOnce(['my-skill']);
      vi.mocked(prompts.select).mockResolvedValue('copy');
      vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['opencode', 'amp']);
      vi.mocked(copySkills).mockResolvedValue([
        { skill: 'my-skill', status: 'copied' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor', 'opencode'], project: true });

      // Both share .agents/skills, so only ONE copySkills call
      expect(copySkills).toHaveBeenCalledOnce();
    });

    it('returns gracefully when user cancels mode prompt', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked(prompts.multiselect).mockResolvedValueOnce(['my-skill']);
      // isCancel returns true only for the select result
      const selectResult = Symbol('cancel');
      vi.mocked(prompts.select).mockResolvedValue(selectResult);
      vi.mocked(prompts.isCancel)
        .mockReturnValueOnce(false)   // for skill multiselect check
        .mockReturnValueOnce(true);   // for mode select check

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true });

      expect(prompts.cancel).toHaveBeenCalledWith('Cancelled.');
      expect(copySkills).not.toHaveBeenCalled();
      expect(createProjectSymlinks).not.toHaveBeenCalled();
    });

    it('saves config after successful project link', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked(prompts.multiselect).mockResolvedValueOnce(['my-skill']);
      vi.mocked(prompts.select).mockResolvedValue('copy');
      vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['cursor']);
      vi.mocked(copySkills).mockResolvedValue([
        { skill: 'my-skill', status: 'copied' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true });

      expect(writeConfig).toHaveBeenCalledWith({
        lastLinkedAgents: ['cursor'],
      });
    });

    it('shows skill multiselect prompt without pre-selection', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['skill-a', 'skill-b']);
      vi.mocked(prompts.multiselect).mockResolvedValueOnce(['skill-a', 'skill-b']);
      vi.mocked(prompts.select).mockResolvedValue('copy');
      vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['cursor']);
      vi.mocked(copySkills).mockResolvedValue([
        { skill: 'skill-a', status: 'copied' },
        { skill: 'skill-b', status: 'copied' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true });

      // First multiselect call is for skills — no pre-selection in project mode
      const skillMultiselectCall = vi.mocked(prompts.multiselect).mock.calls[0][0] as { initialValues?: string[]; options?: Array<{ value: string; label: string }> };
      expect(skillMultiselectCall.options).toEqual([
        { value: 'skill-a', label: 'skill-a' },
        { value: 'skill-b', label: 'skill-b' },
      ]);
      expect(skillMultiselectCall.initialValues).toBeUndefined();
    });

    it('only links user-selected skills in project mode', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['skill-a', 'skill-b']);
      vi.mocked(prompts.multiselect).mockResolvedValueOnce(['skill-b']);
      vi.mocked(prompts.select).mockResolvedValue('copy');
      vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['cursor']);
      vi.mocked(copySkills).mockResolvedValue([
        { skill: 'skill-b', status: 'copied' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true });

      // copySkills receives only the selected skill
      const callArgs = vi.mocked(copySkills).mock.calls[0];
      expect(callArgs[2]).toEqual(['skill-b']);
    });

    it('returns gracefully when user cancels skill multiselect', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked(prompts.multiselect)
        .mockResolvedValueOnce(Symbol('cancel') as symbol);
      vi.mocked(prompts.isCancel)
        .mockReturnValueOnce(true);   // for skill multiselect check

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true });

      expect(prompts.cancel).toHaveBeenCalledWith('No skills selected.');
      expect(copySkills).not.toHaveBeenCalled();
      expect(createProjectSymlinks).not.toHaveBeenCalled();
    });

    it('returns gracefully when user cancels agent multiselect in project mode', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked(prompts.multiselect).mockResolvedValueOnce(['my-skill']);
      vi.mocked(prompts.select).mockResolvedValue('copy');
      vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(searchMultiselectModule.cancelSymbol);

      const { linkCommand } = await import('./link.js');
      // Do NOT pass agents so the interactive prompt is shown
      await linkCommand({ project: true });

      expect(prompts.cancel).toHaveBeenCalledWith('No agents selected.');
      expect(copySkills).not.toHaveBeenCalled();
      expect(createProjectSymlinks).not.toHaveBeenCalled();
    });

    it('skips all prompts in project mode when --agents, --skills, --mode provided', async () => {
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill', 'other-skill']);
      vi.mocked(copySkills).mockResolvedValue([
        { skill: 'my-skill', status: 'copied' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true, skills: ['my-skill'], mode: 'copy' });

      // No interactive prompts should be called
      expect(prompts.multiselect).not.toHaveBeenCalled();
      expect(prompts.select).not.toHaveBeenCalled();
      expect(searchMultiselectModule.searchMultiselect).not.toHaveBeenCalled();
      expect(copySkills).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(copySkills).mock.calls[0];
      expect(callArgs[2]).toEqual(['my-skill']);
    });

    it('throws CliError for unknown skills in --skills', async () => {
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);

      const { linkCommand } = await import('./link.js');
      await expect(
        linkCommand({ agents: ['cursor'], project: true, skills: ['nonexistent'], mode: 'copy' }),
      ).rejects.toThrow(CliError);
    });

    it('throws CliError for invalid --mode value', async () => {
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);

      const { linkCommand } = await import('./link.js');
      await expect(
        linkCommand({ agents: ['cursor'], project: true, skills: ['my-skill'], mode: 'invalid' }),
      ).rejects.toThrow(CliError);
    });

    it('does not show skill multiselect in global mode', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(searchMultiselectModule.searchMultiselect).mockResolvedValue(['cursor']);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked(createSkillSymlinks).mockResolvedValue([
        { skill: 'my-skill', status: 'created' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({});

      // In global mode: no prompts.multiselect call (skills not selectable), only searchMultiselect
      expect(prompts.multiselect).not.toHaveBeenCalled();
      expect(searchMultiselectModule.searchMultiselect).toHaveBeenCalledOnce();
    });
  });

  it('skips agent prompt in global mode when --agents provided', async () => {
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockResolvedValue([
      { skill: 'my-skill', status: 'created' },
    ]);

    const { linkCommand } = await import('./link.js');
    await linkCommand({ agents: ['cursor'] });

    // No multiselect prompt — agents provided via CLI
    expect(prompts.multiselect).not.toHaveBeenCalled();
    expect(searchMultiselectModule.searchMultiselect).not.toHaveBeenCalled();
    expect(createSkillSymlinks).toHaveBeenCalledOnce();
  });
});
