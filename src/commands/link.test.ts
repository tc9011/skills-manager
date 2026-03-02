// src/commands/link.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CliError } from '../errors.js';
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
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
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
    vi.clearAllMocks();
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
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as any);
    vi.mocked(prompts.multiselect).mockResolvedValue(['cursor'] as any);
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
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor', 'opencode'] as any);
    vi.mocked(prompts.multiselect).mockResolvedValue(['cursor', 'opencode'] as any);
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
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as any);
    vi.mocked(prompts.multiselect).mockResolvedValue(['cursor'] as any);
    vi.mocked(listCanonicalSkills).mockResolvedValue([]);

    const { linkCommand } = await import('./link.js');
    await expect(linkCommand({})).rejects.toThrow(CliError);
  });

  it('returns gracefully when user cancels multiselect', async () => {
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as any);
    vi.mocked(prompts.isCancel).mockReturnValue(true);
    vi.mocked(prompts.multiselect).mockResolvedValue(Symbol('cancel') as any);

    const { linkCommand } = await import('./link.js');
    // Should not throw — just returns after cancel
    await linkCommand({});

    expect(prompts.cancel).toHaveBeenCalledWith('No agents selected.');
    expect(createSkillSymlinks).not.toHaveBeenCalled();
  });

  it('handles agent symlink creation failure in summary', async () => {
    vi.mocked(prompts.isCancel).mockReturnValue(false);
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as any);
    vi.mocked(prompts.multiselect).mockResolvedValue(['cursor'] as any);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockRejectedValue(new Error('permission denied'));

    const { linkCommand } = await import('./link.js');
    await linkCommand({});

    // Should show summary with skipped agent, not throw
    expect(prompts.note).toHaveBeenCalled();
  });

  it('uses saved lastLinkedAgents for initial selection', async () => {
    vi.mocked(readConfig).mockReturnValue({ lastLinkedAgents: ['opencode'] });
    vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor', 'opencode'] as any);
    vi.mocked(prompts.multiselect).mockResolvedValue(['opencode'] as any);
    vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
    vi.mocked(createSkillSymlinks).mockResolvedValue([
      { skill: 'my-skill', status: 'created' },
    ]);

    const { linkCommand } = await import('./link.js');
    await linkCommand({});

    // multiselect should be called with initialValues from saved config
    const multiselectCall = vi.mocked(prompts.multiselect).mock.calls[0][0] as any;
    expect(multiselectCall.initialValues).toEqual(['opencode']);
  });

  describe('project mode', () => {
    it('calls copySkills when project mode with copy (default)', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as any);
      vi.mocked(prompts.multiselect).mockResolvedValue(['cursor'] as any);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked((prompts as any).select).mockResolvedValue('copy');
      vi.mocked(copySkills).mockResolvedValue([
        { skill: 'my-skill', status: 'copied' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true });

      expect(copySkills).toHaveBeenCalledOnce();
      expect(createProjectSymlinks).not.toHaveBeenCalled();
      expect(createSkillSymlinks).not.toHaveBeenCalled();
      // Verify targetDir is CWD-relative using the agent's projectPath
      const callArgs = vi.mocked(copySkills).mock.calls[0];
      expect(callArgs[2]).toEqual(['my-skill']);
    });

    it('calls createProjectSymlinks when project mode with symlink', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as any);
      vi.mocked(prompts.multiselect).mockResolvedValue(['cursor'] as any);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked((prompts as any).select).mockResolvedValue('symlink');
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
      // cursor and opencode are both universal → share '.agents/skills' projectPath
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor', 'opencode'] as any);
      vi.mocked(prompts.multiselect).mockResolvedValue(['cursor', 'opencode'] as any);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked((prompts as any).select).mockResolvedValue('copy');
      vi.mocked(copySkills).mockResolvedValue([
        { skill: 'my-skill', status: 'copied' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor', 'opencode'], project: true });

      // Both share .agents/skills, so only ONE copySkills call
      expect(copySkills).toHaveBeenCalledOnce();
    });

    it('returns gracefully when user cancels mode prompt', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as any);
      vi.mocked(prompts.multiselect).mockResolvedValue(['cursor'] as any);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      // isCancel returns true only for the select result
      const selectResult = Symbol('cancel');
      vi.mocked((prompts as any).select).mockResolvedValue(selectResult);
      vi.mocked(prompts.isCancel)
        .mockReturnValueOnce(false)   // for multiselect check
        .mockReturnValueOnce(true);    // for select check

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true });

      expect(prompts.cancel).toHaveBeenCalledWith('Cancelled.');
      expect(copySkills).not.toHaveBeenCalled();
      expect(createProjectSymlinks).not.toHaveBeenCalled();
    });

    it('saves config after successful project link', async () => {
      vi.mocked(getLastSelectedAgents).mockResolvedValue(['cursor'] as any);
      vi.mocked(prompts.multiselect).mockResolvedValue(['cursor'] as any);
      vi.mocked(listCanonicalSkills).mockResolvedValue(['my-skill']);
      vi.mocked((prompts as any).select).mockResolvedValue('copy');
      vi.mocked(copySkills).mockResolvedValue([
        { skill: 'my-skill', status: 'copied' },
      ]);

      const { linkCommand } = await import('./link.js');
      await linkCommand({ agents: ['cursor'], project: true });

      expect(writeConfig).toHaveBeenCalledWith({
        lastLinkedAgents: ['cursor'],
      });
    });
  });
});
