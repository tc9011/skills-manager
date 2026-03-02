// src/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGitHubToken } from './auth.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
const mockExecSync = vi.mocked(execSync);

describe('getGitHubToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
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
});
