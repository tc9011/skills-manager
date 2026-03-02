// src/commands/pull.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CliError } from '../errors.js';
import { ensureGitHubToken } from '../auth.js';
import { pullSkills, buildRemoteUrl, getRepoRemoteUrl } from '../git-ops.js';

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  cancel: vi.fn(),
  outro: vi.fn(),
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
}));

// Mock auth — return null to test the "no repo and no remote" path
vi.mock('../auth.js', () => ({
  ensureGitHubToken: vi.fn(async () => null),
}));

// Mock git-ops — getRepoRemoteUrl returns null (no existing remote)
vi.mock('../git-ops.js', () => ({
  getRepoRemoteUrl: vi.fn(async () => null),
  pullSkills: vi.fn(),
  buildRemoteUrl: vi.fn((repo: string) => `https://github.com/${repo}.git`),
}));

describe('pullCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('pulls skills and runs link on happy path', async () => {
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(buildRemoteUrl).mockReturnValue('https://github.com/owner/repo.git');
    vi.mocked(pullSkills).mockResolvedValue({ cloned: true, pulled: false });

    // Mock linkCommand to avoid running the full link flow
    vi.mock('./link.js', () => ({ linkCommand: vi.fn() }));

    const { pullCommand } = await import('./pull.js');
    await pullCommand({ repo: 'owner/repo' });

    expect(pullSkills).toHaveBeenCalledOnce();
    expect(buildRemoteUrl).toHaveBeenCalledWith('owner/repo');
  });

  it('throws CliError when pullSkills throws', async () => {
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(buildRemoteUrl).mockReturnValue('https://github.com/owner/repo.git');
    vi.mocked(pullSkills).mockRejectedValue(new Error('network error'));

    const { pullCommand } = await import('./pull.js');
    await expect(pullCommand({ repo: 'owner/repo' })).rejects.toThrow(CliError);
  });

  it('skips link when --skip-link flag is set', async () => {
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(buildRemoteUrl).mockReturnValue('https://github.com/owner/repo.git');
    vi.mocked(pullSkills).mockResolvedValue({ cloned: false, pulled: true });

    const linkMod = await import('./link.js');
    vi.mocked(linkMod.linkCommand).mockResolvedValue(undefined);

    const { pullCommand } = await import('./pull.js');
    await pullCommand({ repo: 'owner/repo', skipLink: true });

    expect(linkMod.linkCommand).not.toHaveBeenCalled();
  });

  it('uses existing remote when no --repo option', async () => {
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(getRepoRemoteUrl).mockResolvedValue('https://github.com/existing/repo.git');
    vi.mocked(pullSkills).mockResolvedValue({ cloned: false, pulled: true });

    const linkMod = await import('./link.js');
    vi.mocked(linkMod.linkCommand).mockResolvedValue(undefined);

    const { pullCommand } = await import('./pull.js');
    await pullCommand({});

    expect(pullSkills).toHaveBeenCalledWith(
      expect.any(String),
      'https://github.com/existing/repo.git',
      'ghp_test_token',
    );
    expect(buildRemoteUrl).not.toHaveBeenCalled();
  });
});
