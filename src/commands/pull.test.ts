// src/commands/pull.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CliError } from '../errors.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  cancel: vi.fn(),
  outro: vi.fn(),
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
}));

// Mock auth — return null to test the "no repo and no remote" path
vi.mock('../auth.js', () => ({
  getGitHubToken: vi.fn(() => null),
}));

// Mock git-ops — getRepoRemoteUrl returns null (no existing remote)
vi.mock('../git-ops.js', () => ({
  getRepoRemoteUrl: vi.fn(async () => null),
  pullSkills: vi.fn(),
  buildRemoteUrl: vi.fn((repo: string) => `https://github.com/${repo}.git`),
}));

describe('pullCommand', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws CliError when no repo specified and no existing remote', async () => {
    const { pullCommand } = await import('./pull.js');
    await expect(
      pullCommand({}),
    ).rejects.toThrow(CliError);
  });

  it('module exports a pullCommand function', async () => {
    const mod = await import('./pull.js');
    expect(typeof mod.pullCommand).toBe('function');
  });
});
