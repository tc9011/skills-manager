// src/commands/link.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CliError } from '../errors.js';
import { getLastSelectedAgents } from '../lockfile.js';
import { readConfig, writeConfig } from '../config.js';
import { createSkillSymlinks, listCanonicalSkills } from '../linker.js';
import * as prompts from '@clack/prompts';

// Mock @clack/prompts to avoid interactive prompts in tests
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  cancel: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
  multiselect: vi.fn(),
  isCancel: vi.fn(() => false),
}));

vi.mock('../lockfile.js', () => ({
  getLastSelectedAgents: vi.fn(),
}));

vi.mock('../linker.js', () => ({
  createSkillSymlinks: vi.fn(),
  listCanonicalSkills: vi.fn(),
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
});
