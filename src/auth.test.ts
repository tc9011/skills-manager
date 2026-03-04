// src/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGitHubToken, ensureGitHubToken } from './auth.js';
import type { SpawnSyncReturns } from 'node:child_process';
import { CliError } from './errors.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  spawnSync: vi.fn(),
}));

vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
  note: vi.fn(),
  log: { step: vi.fn() },
}));

import { execSync, spawnSync } from 'node:child_process';
import * as p from '@clack/prompts';
const mockExecSync = vi.mocked(execSync);
const mockSpawnSync = vi.mocked(spawnSync);

describe('getGitHubToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  it('returns token from gh auth token', () => {
    mockExecSync.mockReturnValue('ghp_abc123\n');
    const token = getGitHubToken();
    expect(token).toBe('ghp_abc123');
    expect(mockExecSync).toHaveBeenCalledWith('gh auth token', expect.any(Object));
  });

  it('falls back to GITHUB_TOKEN env var', () => {
    mockExecSync.mockImplementation(() => { throw new Error('gh not found'); });
    process.env.GITHUB_TOKEN = 'ghp_env_token';
    const token = getGitHubToken();
    expect(token).toBe('ghp_env_token');
  });

  it('falls back to GH_TOKEN env var', () => {
    mockExecSync.mockImplementation(() => { throw new Error('gh not found'); });
    process.env.GH_TOKEN = 'ghp_gh_token';
    const token = getGitHubToken();
    expect(token).toBe('ghp_gh_token');
  });

  it('returns null when no auth available', () => {
    mockExecSync.mockImplementation(() => { throw new Error('gh not found'); });
    const token = getGitHubToken();
    expect(token).toBeNull();
  });

  it('returns null when gh auth token returns empty string', () => {
    mockExecSync.mockReturnValue('   \n');
    const token = getGitHubToken();
    expect(token).toBeNull();
  });

  it('prefers GITHUB_TOKEN over GH_TOKEN', () => {
    mockExecSync.mockImplementation(() => { throw new Error('gh not found'); });
    process.env.GITHUB_TOKEN = 'ghp_github_token';
    process.env.GH_TOKEN = 'ghp_gh_token';
    const token = getGitHubToken();
    expect(token).toBe('ghp_github_token');
  });
});

describe('ensureGitHubToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });

  it('returns existing token without prompting', async () => {
    mockExecSync.mockReturnValue('ghp_existing\n');
    const token = await ensureGitHubToken();
    expect(token).toBe('ghp_existing');
    expect(p.select).not.toHaveBeenCalled();
  });

  it('runs gh auth login when user selects gh', async () => {
    // First call: no token. After spawnSync: token available.
    mockExecSync
      .mockImplementationOnce(() => { throw new Error('no gh'); })
      .mockReturnValueOnce('ghp_new_token\n');
    vi.mocked(p.select).mockResolvedValue('gh');
    mockSpawnSync.mockReturnValue({ status: 0, pid: 0, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), signal: null } as SpawnSyncReturns<Buffer>);

    const token = await ensureGitHubToken();
    expect(token).toBe('ghp_new_token');
    expect(mockSpawnSync).toHaveBeenCalledWith('gh', ['auth', 'login'], { stdio: 'inherit' });
  });

  it('throws CliError when user selects env', async () => {
    mockExecSync.mockImplementation(() => { throw new Error('no gh'); });
    vi.mocked(p.isCancel).mockReturnValue(false);
    vi.mocked(p.select).mockResolvedValue('env');

    await expect(ensureGitHubToken()).rejects.toThrow(CliError);
    expect(p.note).toHaveBeenCalled();
  });

  it('throws CliError when user cancels', async () => {
    mockExecSync.mockImplementation(() => { throw new Error('no gh'); });
    vi.mocked(p.isCancel).mockReturnValue(true);
    vi.mocked(p.select).mockResolvedValue(Symbol('cancel') as symbol);

    await expect(ensureGitHubToken()).rejects.toThrow(CliError);
  });

  it('throws CliError when gh auth login fails (non-zero status)', async () => {
    mockExecSync.mockImplementation(() => { throw new Error('no gh'); });
    vi.mocked(p.isCancel).mockReturnValue(false);
    vi.mocked(p.select).mockResolvedValue('gh');
    mockSpawnSync.mockReturnValue({ status: 1, pid: 0, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), signal: null } as SpawnSyncReturns<Buffer>);

    await expect(ensureGitHubToken()).rejects.toThrow(CliError);
    await expect(ensureGitHubToken()).rejects.toThrow('gh auth login failed');
  });

  it('throws CliError when token is still null after successful gh auth login', async () => {
    // First call: no token. spawnSync succeeds. Second call: still no token.
    mockExecSync.mockImplementation(() => { throw new Error('no gh'); });
    vi.mocked(p.isCancel).mockReturnValue(false);
    vi.mocked(p.select).mockResolvedValue('gh');
    mockSpawnSync.mockReturnValue({ status: 0, pid: 0, output: [], stdout: Buffer.from(''), stderr: Buffer.from(''), signal: null } as SpawnSyncReturns<Buffer>);

    await expect(ensureGitHubToken()).rejects.toThrow(CliError);
    await expect(ensureGitHubToken()).rejects.toThrow('No token after gh auth login');
  });

});
