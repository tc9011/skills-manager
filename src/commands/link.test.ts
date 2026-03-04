// src/commands/link.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CliError } from '../errors.js';
import type { AgentId } from '../agents.js';
import { getLastSelectedAgents } from '../lockfile.js';
import { readConfig, writeConfig } from '../config.js';
import { createSkillSymlinks, listCanonicalSkills, copySkills, createProjectSymlinks } from '../linker.js';
import * as prompts from '@clack/prompts';

// Mock @clack/prompts to avoid interactive prompts in tests
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

  it('links skills to agents on happy path', async () => {
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
    vi.mocked(prompts.multiselect).mockResolvedValue(['cursor']);
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
    vi.mocked(prompts.multiselect).mockResolvedValue(['cursor', 'opencode']);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockResolvedValue([
      { skill: 'my-skill', status: 'created' },
    ]);

    const { linkCommand } = await import('./link.js');
    await linkCommand({});

    expect(writeConfig).toHaveBeenCalledWith({
      lastLinkedAgents: ['cursor', 'opencode'],
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
    vi.mocked(prompts.isCancel).mockReturnValue(true);
    vi.mocked(prompts.multiselect).mockResolvedValue(Symbol('cancel') as symbol);

    const { linkCommand } = await import('./link.js');
    // Should not throw — just returns after cancel
    await linkCommand({});

    expect(prompts.cancel).toHaveBeenCalledWith('No agents selected.');
    expect(createSkillSymlinks).not.toHaveBeenCalled();
  });

  it('handles agent symlink creation failure in summary', async () => {
    vi.mocked(prompts.isCancel).mockReturnValue(false);
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
    vi.mocked(prompts.multiselect).mockResolvedValue(['cursor']);
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
    vi.mocked(prompts.multiselect).mockResolvedValue(['opencode']);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockResolvedValue([
      { skill: 'my-skill', status: 'created' },
    ]);

    const { linkCommand } = await import('./link.js');
    await linkCommand({});

    // multiselect should be called with initialValues from saved config
    const multiselectCall = vi.mocked(prompts.multiselect).mock.calls[0][0] as { initialValues?: string[]; options?: Array<{ value: string; label: string }> };
    expect(multiselectCall.initialValues).toEqual(['opencode']);
  });

  describe('project mode', () => {
    // New prompt order: skills → copy/symlink → agents

    it('calls copySkills when project mode with copy (default)', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked(prompts.multiselect)
        .mockResolvedValueOnce(['my-skill'])
        .mockResolvedValueOnce(['cursor']);
      vi.mocked(prompts.select).mockResolvedValue('copy');
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
      vi.mocked(prompts.multiselect)
        .mockResolvedValueOnce(['my-skill'])
        .mockResolvedValueOnce(['cursor']);
      vi.mocked(prompts.select).mockResolvedValue('symlink');
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
      vi.mocked(prompts.multiselect)
        .mockResolvedValueOnce(['my-skill'])
        .mockResolvedValueOnce(['opencode', 'amp']);
      vi.mocked(prompts.select).mockResolvedValue('copy');
      vi.mocked(copySkills).mockResolvedValue([
        { skill: 'my-skill', status: 'copied' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['opencode', 'amp'], project: true });

      // Both share .agents/skills, so only ONE copySkills call
      expect(copySkills).toHaveBeenCalledOnce();
    });

    it('returns gracefully when user cancels mode prompt', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked(prompts.multiselect)
        .mockResolvedValueOnce(['my-skill']);
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
      vi.mocked(prompts.multiselect)
        .mockResolvedValueOnce(['my-skill'])
        .mockResolvedValueOnce(['cursor']);
      vi.mocked(prompts.select).mockResolvedValue('copy');
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
      vi.mocked(prompts.multiselect)
        .mockResolvedValueOnce(['skill-a', 'skill-b'])
        .mockResolvedValueOnce(['cursor']);
      vi.mocked(prompts.select).mockResolvedValue('copy');
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
      vi.mocked(prompts.multiselect)
        .mockResolvedValueOnce(['skill-b'])
        .mockResolvedValueOnce(['cursor']);
      vi.mocked(prompts.select).mockResolvedValue('copy');
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
      vi.mocked(prompts.multiselect)
        .mockResolvedValueOnce(['my-skill'])
        .mockResolvedValueOnce(Symbol('cancel') as symbol);
      vi.mocked(prompts.select).mockResolvedValue('copy');
      vi.mocked(prompts.isCancel)
        .mockReturnValueOnce(false)   // for skill multiselect check
        .mockReturnValueOnce(false)   // for mode select check
        .mockReturnValueOnce(true);   // for agent multiselect check

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true });

      expect(prompts.cancel).toHaveBeenCalledWith('No agents selected.');
      expect(copySkills).not.toHaveBeenCalled();
      expect(createProjectSymlinks).not.toHaveBeenCalled();
    });

    it('does not show skill multiselect in global mode', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as AgentId[]);
      vi.mocked(prompts.multiselect).mockResolvedValue(['cursor']);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked(createSkillSymlinks).mockResolvedValue([
        { skill: 'my-skill', status: 'created' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({});

      // Only one multiselect call (agents), NOT two
      expect(prompts.multiselect).toHaveBeenCalledOnce();
    });
  });
});
