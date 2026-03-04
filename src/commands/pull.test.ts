// src/commands/pull.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CliError } from '../errors.js';
import { ensureGitHubToken } from '../auth.js';
import {
  pullSkills,
  buildRemoteUrl,
  getRepoRemoteUrl,
  ensureGitRepo,
  ensureRemote,
} from '../git-ops.js';

const mockPrompts = vi.hoisted(() => ({
  intro: vi.fn(),
  cancel: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  log: { step: vi.fn(), warn: vi.fn(), info: vi.fn(), message: vi.fn(), success: vi.fn(), error: vi.fn() },
  spinner: () => ({ start: vi.fn(), stop: vi.fn(), error: vi.fn() }),
  text: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
}));

vi.mock('@clack/prompts', () => mockPrompts);

vi.mock('../auth.js', () => ({
  ensureGitHubToken: vi.fn(),
}));

vi.mock('../git-ops.js', () => ({
  getRepoRemoteUrl: vi.fn(),
  pullSkills: vi.fn(),
  buildRemoteUrl: vi.fn((repo: string) => `https://github.com/${repo}.git`),
  ensureGitRepo: vi.fn(),
  ensureRemote: vi.fn(),
  createGitHubRepo: vi.fn(),
}));

// Mock linkCommand to avoid running the full link flow
vi.mock('./link.js', () => ({ linkCommand: vi.fn() }));

describe('pullCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('module exports a pullCommand function', async () => {
    const mod = await import('./pull.js');
    expect(typeof mod.pullCommand).toBe('function');
  });

  it('pulls skills and runs link on happy path with --repo', async () => {
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(buildRemoteUrl).mockReturnValue('https://github.com/owner/repo.git');
    vi.mocked(pullSkills).mockResolvedValue({ cloned: true, pulled: false });

    const { pullCommand } = await import('./pull.js');
    await pullCommand({ repo: 'owner/repo' });

    expect(pullSkills).toHaveBeenCalledOnce();
    expect(buildRemoteUrl).toHaveBeenCalledWith('owner/repo');
  });

  it('uses existing remote when no --repo option', async () => {
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(getRepoRemoteUrl).mockResolvedValue('https://github.com/existing/repo.git');
    vi.mocked(pullSkills).mockResolvedValue({ cloned: false, pulled: true });

    const { pullCommand } = await import('./pull.js');
    await pullCommand({});

    expect(pullSkills).toHaveBeenCalledWith(
      expect.any(String),
      'https://github.com/existing/repo.git',
      'ghp_test_token',
    );
    expect(buildRemoteUrl).not.toHaveBeenCalled();
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

  // === NEW TESTS: interactive repo prompt when no --repo and no remote ===

  it('prompts for repo interactively when no --repo and no remote, then pulls', async () => {
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(ensureGitRepo).mockResolvedValue({ initialized: false });
    vi.mocked(getRepoRemoteUrl).mockResolvedValue(null);
    // User types repo name
    mockPrompts.text.mockResolvedValue('owner/my-skills');
    vi.mocked(ensureRemote).mockResolvedValue({
      remoteUrl: 'https://github.com/owner/my-skills.git',
      added: true,
    });
    vi.mocked(pullSkills).mockResolvedValue({ cloned: true, pulled: false });

    const { pullCommand } = await import('./pull.js');
    await pullCommand({});

    expect(ensureGitRepo).toHaveBeenCalledOnce();
    expect(mockPrompts.text).toHaveBeenCalled();
    expect(ensureRemote).toHaveBeenCalled();
    expect(pullSkills).toHaveBeenCalledOnce();
  });

  it('throws CliError when user cancels interactive repo prompt', async () => {
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(ensureGitRepo).mockResolvedValue({ initialized: false });
    vi.mocked(getRepoRemoteUrl).mockResolvedValue(null);
    // Simulate user pressing Ctrl+C
    mockPrompts.text.mockResolvedValue(Symbol('cancel'));
    mockPrompts.isCancel.mockReturnValue(true);

    const { pullCommand } = await import('./pull.js');
    await expect(pullCommand({})).rejects.toThrow(CliError);
  });

  it('skips link when pull has no changes (pulled: false, cloned: false)', async () => {
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(buildRemoteUrl).mockReturnValue('https://github.com/owner/repo.git');
    vi.mocked(pullSkills).mockResolvedValue({ cloned: false, pulled: false });

    const linkMod = await import('./link.js');
    vi.mocked(linkMod.linkCommand).mockResolvedValue(undefined);

    const { pullCommand } = await import('./pull.js');
    await pullCommand({ repo: 'owner/repo' });

    expect(linkMod.linkCommand).not.toHaveBeenCalled();
  });

  it('runs link when pull brings new changes (pulled: true)', async () => {
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(buildRemoteUrl).mockReturnValue('https://github.com/owner/repo.git');
    vi.mocked(pullSkills).mockResolvedValue({ cloned: false, pulled: true });

    const linkMod = await import('./link.js');
    vi.mocked(linkMod.linkCommand).mockResolvedValue(undefined);

    const { pullCommand } = await import('./pull.js');
    await pullCommand({ repo: 'owner/repo' });

    expect(linkMod.linkCommand).toHaveBeenCalledOnce();
  });
});
