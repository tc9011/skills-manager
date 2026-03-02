// src/commands/push.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureGitHubToken } from '../auth.js';
import { pushSkills, getRepoRemoteUrl } from '../git-ops.js';

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  cancel: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
}));

vi.mock('../auth.js', () => ({
  ensureGitHubToken: vi.fn(),
}));

vi.mock('../git-ops.js', () => ({
  getRepoRemoteUrl: vi.fn(),
  pushSkills: vi.fn(),
}));

describe('push command logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('module exports a pushCommand function', async () => {
    const mod = await import('./push.js');
    expect(typeof mod.pushCommand).toBe('function');
  });

  it('pushes skills on happy path', async () => {
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(getRepoRemoteUrl).mockResolvedValue('https://github.com/user/repo.git');
    vi.mocked(pushSkills).mockResolvedValue({ committed: true, pushed: true });

    const { pushCommand } = await import('./push.js');
    await pushCommand({ message: 'test commit' });

    expect(pushSkills).toHaveBeenCalledOnce();
    expect(vi.mocked(pushSkills).mock.calls[0][1]).toBe('test commit');
    expect(vi.mocked(pushSkills).mock.calls[0][2]).toBe('ghp_test_token');
  });

  it('throws CliError when no remote found', async () => {
    const { CliError } = await import('../errors.js');
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(getRepoRemoteUrl).mockResolvedValue(null);

    const { pushCommand } = await import('./push.js');
    await expect(pushCommand({})).rejects.toThrow(CliError);
  });

  it('throws CliError when pushSkills throws', async () => {
    const { CliError } = await import('../errors.js');
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(getRepoRemoteUrl).mockResolvedValue('https://github.com/user/repo.git');
    vi.mocked(pushSkills).mockRejectedValue(new Error('push failed'));

    const { pushCommand } = await import('./push.js');
    await expect(pushCommand({})).rejects.toThrow(CliError);
  });

  it('shows warning for suspicious files', async () => {
    const prompts = await import('@clack/prompts');
    vi.mocked(ensureGitHubToken).mockResolvedValue('ghp_test_token');
    vi.mocked(getRepoRemoteUrl).mockResolvedValue('https://github.com/user/repo.git');
    vi.mocked(pushSkills).mockResolvedValue({
      committed: true,
      pushed: true,
      suspiciousFiles: ['.env', 'credentials.json'],
    });

    const { pushCommand } = await import('./push.js');
    await pushCommand({});

    expect(prompts.note).toHaveBeenCalledOnce();
  });
});
