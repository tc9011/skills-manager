// src/commands/push.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGitHubToken } from '../auth.js';
import { pushSkills, getRepoRemoteUrl, ensureGitRepo, ensureRemote, createGitHubRepo } from '../git-ops.js';

const mockPrompts = vi.hoisted(() => ({
  intro: vi.fn(),
  cancel: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  log: { step: vi.fn(), warn: vi.fn(), info: vi.fn(), message: vi.fn(), success: vi.fn(), error: vi.fn() },
  spinner: () => ({ start: vi.fn(), stop: vi.fn(), error: vi.fn() }),
  text: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
  isCancel: vi.fn(() => false),
}));

vi.mock('@clack/prompts', () => mockPrompts);

vi.mock('../auth.js', () => ({
  getGitHubToken: vi.fn(),
}));

vi.mock('../git-ops.js', () => ({
  getRepoRemoteUrl: vi.fn(),
  pushSkills: vi.fn(),
  ensureGitRepo: vi.fn(),
  ensureRemote: vi.fn(),
  createGitHubRepo: vi.fn(),
  buildRemoteUrl: vi.fn((repo: string) => `https://github.com/${repo}.git`),
}));

describe('push command logic', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('module exports a pushCommand function', async () => {
    const mod = await import('./push.js');
    expect(typeof mod.pushCommand).toBe('function');
  });

  it('pushes skills on happy path (git repo + remote already exist)', async () => {
    vi.mocked(getGitHubToken).mockReturnValue('ghp_test_token');
    vi.mocked(ensureGitRepo).mockResolvedValue({ initialized: false });
    vi.mocked(getRepoRemoteUrl).mockResolvedValue('https://github.com/user/repo.git');
    vi.mocked(pushSkills).mockResolvedValue({ committed: true, pushed: true });

    const { pushCommand } = await import('./push.js');
    await pushCommand({ message: 'test commit' });

    expect(ensureGitRepo).toHaveBeenCalledOnce();
    expect(pushSkills).toHaveBeenCalledOnce();
    expect(vi.mocked(pushSkills).mock.calls[0][1]).toBe('test commit');
    expect(vi.mocked(pushSkills).mock.calls[0][2]).toBe('ghp_test_token');
  });

  it('auto-inits git and prompts for repo when no remote', async () => {
    vi.mocked(getGitHubToken).mockReturnValue('ghp_test_token');
    vi.mocked(ensureGitRepo).mockResolvedValue({ initialized: true });
    vi.mocked(getRepoRemoteUrl).mockResolvedValue(null);
    // User types repo name
    mockPrompts.text.mockResolvedValue('owner/my-skills');
    vi.mocked(ensureRemote).mockResolvedValue({
      remoteUrl: 'https://github.com/owner/my-skills.git',
      added: true,
    });
    // User declines creating a remote repo
    mockPrompts.confirm.mockResolvedValue(false);
    vi.mocked(pushSkills).mockResolvedValue({ committed: true, pushed: true });

    const { pushCommand } = await import('./push.js');
    await pushCommand({});

    expect(ensureGitRepo).toHaveBeenCalledOnce();
    expect(mockPrompts.text).toHaveBeenCalled();
    expect(ensureRemote).toHaveBeenCalled();
    expect(pushSkills).toHaveBeenCalledOnce();
  });

  it('creates GitHub repo via gh when push fails and user confirms', async () => {
    vi.mocked(getGitHubToken).mockReturnValue('ghp_test_token');
    vi.mocked(ensureGitRepo).mockResolvedValue({ initialized: true });
    vi.mocked(getRepoRemoteUrl).mockResolvedValue(null);
    mockPrompts.text.mockResolvedValue('owner/my-skills');
    vi.mocked(ensureRemote).mockResolvedValue({
      remoteUrl: 'https://github.com/owner/my-skills.git',
      added: true,
    });
    // User confirms creating repo
    mockPrompts.confirm.mockResolvedValue(true);
    vi.mocked(createGitHubRepo).mockReturnValue(undefined);
    vi.mocked(pushSkills).mockResolvedValue({ committed: true, pushed: true });

    const { pushCommand } = await import('./push.js');
    await pushCommand({});

    expect(createGitHubRepo).toHaveBeenCalledWith('owner/my-skills');
    expect(pushSkills).toHaveBeenCalledOnce();
  });

  it('throws CliError when user cancels repo prompt', async () => {
    const { CliError } = await import('../errors.js');
    vi.mocked(getGitHubToken).mockReturnValue('ghp_test_token');
    vi.mocked(ensureGitRepo).mockResolvedValue({ initialized: false });
    vi.mocked(getRepoRemoteUrl).mockResolvedValue(null);
    // Simulate user pressing Ctrl+C
    mockPrompts.text.mockResolvedValue(Symbol('cancel'));
    mockPrompts.isCancel.mockReturnValue(true);

    const { pushCommand } = await import('./push.js');
    await expect(pushCommand({})).rejects.toThrow(CliError);
  });

  it('throws CliError when pushSkills throws', async () => {
    const { CliError } = await import('../errors.js');
    vi.mocked(getGitHubToken).mockReturnValue('ghp_test_token');
    vi.mocked(ensureGitRepo).mockResolvedValue({ initialized: false });
    vi.mocked(getRepoRemoteUrl).mockResolvedValue('https://github.com/user/repo.git');
    vi.mocked(pushSkills).mockRejectedValue(new Error('push failed'));

    const { pushCommand } = await import('./push.js');
    await expect(pushCommand({})).rejects.toThrow(CliError);
  });

  it('shows warning for suspicious files', async () => {
    vi.mocked(getGitHubToken).mockReturnValue('ghp_test_token');
    vi.mocked(ensureGitRepo).mockResolvedValue({ initialized: false });
    vi.mocked(getRepoRemoteUrl).mockResolvedValue('https://github.com/user/repo.git');
    vi.mocked(pushSkills).mockResolvedValue({
      committed: true,
      pushed: true,
      suspiciousFiles: ['.env', 'credentials.json'],
    });

    const { pushCommand } = await import('./push.js');
    await pushCommand({});

    expect(mockPrompts.note).toHaveBeenCalledOnce();
  });

  it('throws CliError when user cancels shouldCreate confirm prompt', async () => {
    const { CliError } = await import('../errors.js');
    vi.mocked(getGitHubToken).mockReturnValue('ghp_test_token');
    vi.mocked(ensureGitRepo).mockResolvedValue({ initialized: true });
    vi.mocked(getRepoRemoteUrl).mockResolvedValue(null);
    mockPrompts.text.mockResolvedValue('owner/my-skills');
    vi.mocked(ensureRemote).mockResolvedValue({
      remoteUrl: 'https://github.com/owner/my-skills.git',
      added: true,
    });
    // Simulate user pressing Ctrl+C on confirm prompt
    mockPrompts.confirm.mockResolvedValue(Symbol('cancel'));
    mockPrompts.isCancel.mockImplementation((val) => typeof val === 'symbol');

    const { pushCommand } = await import('./push.js');
    await expect(pushCommand({})).rejects.toThrow(CliError);
    expect(pushSkills).not.toHaveBeenCalled();
  });

  it('shows correct message when committed and pushed', async () => {
    vi.mocked(getGitHubToken).mockReturnValue('ghp_test_token');
    vi.mocked(ensureGitRepo).mockResolvedValue({ initialized: false });
    vi.mocked(getRepoRemoteUrl).mockResolvedValue('https://github.com/user/repo.git');
    vi.mocked(pushSkills).mockResolvedValue({ committed: false, pushed: true });

    const spinnerStop = vi.fn();
    mockPrompts.spinner = () => ({ start: vi.fn(), stop: spinnerStop, error: vi.fn() });

    const { pushCommand } = await import('./push.js');
    await pushCommand({});

    expect(spinnerStop).toHaveBeenCalledWith('Unpushed commits pushed successfully!');
  });
});
