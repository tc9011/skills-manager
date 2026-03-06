// src/git-ops.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildRemoteUrl, detectSuspiciousFiles, ensureGitignore, getRepoRemoteUrl, pushSkills, pullSkills, ensureGitRepo, ensureRemote, createGitHubRepo, isGhInstalled } from './git-ops.js';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { execSync as _execSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// simple-git mock setup (vi.hoisted ensures this runs before vi.mock hoisting)
// ---------------------------------------------------------------------------
const { mockGit, mockExecSync } = vi.hoisted(() => {
  const mockGit = {
    getRemotes: vi.fn(),
    status: vi.fn(),
    add: vi.fn(),
    commit: vi.fn(),
    push: vi.fn(),
    pull: vi.fn(),
    remote: vi.fn(),
    clone: vi.fn(),
    branchLocal: vi.fn(),
    raw: vi.fn(),
    checkout: vi.fn(),
    rebase: vi.fn(),
    init: vi.fn(),
    revparse: vi.fn(),
    fetch: vi.fn(),
  };
  const mockExecSync = vi.fn();
  return { mockGit, mockExecSync };
});

vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => mockGit),
}));

vi.mock('node:child_process', () => ({
  execSync: mockExecSync,
  spawnSync: vi.fn(),
}));

describe('buildRemoteUrl', () => {
  it('builds clean HTTPS URL without credentials', () => {
    const url = buildRemoteUrl('tc9011/my-skills');
    expect(url).toBe('https://github.com/tc9011/my-skills.git');
  });

  it('never includes token in URL', () => {
    // buildRemoteUrl no longer accepts tokens — credentials are handled transiently
    const url = buildRemoteUrl('tc9011/my-skills');
    expect(url).not.toContain('@');
    expect(url).not.toContain('ghp_');
  });
});

describe('detectSuspiciousFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'git-ops-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('detects .env files', async () => {
    await writeFile(join(tempDir, '.env'), 'SECRET=123');
    await writeFile(join(tempDir, 'SKILL.md'), '# Normal file');
    const result = detectSuspiciousFiles(tempDir);
    expect(result).toContain('.env');
    expect(result).not.toContain('SKILL.md');
  });

  it('detects credential and key files', async () => {
    await writeFile(join(tempDir, 'credentials.json'), '{}');
    await writeFile(join(tempDir, 'server.key'), 'key');
    const result = detectSuspiciousFiles(tempDir);
    expect(result).toContain('credentials.json');
    expect(result).toContain('server.key');
  });

  it('returns empty array for clean directory', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), '# OK');
    const result = detectSuspiciousFiles(tempDir);
    expect(result).toEqual([]);
  });

  it('returns empty array for nonexistent directory', () => {
    const result = detectSuspiciousFiles('/nonexistent/path');
    expect(result).toEqual([]);
  });
});

describe('ensureGitignore', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'gitignore-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates .gitignore with defaults when none exists', async () => {
    ensureGitignore(tempDir);
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toContain('.DS_Store');
  });

  it('appends missing patterns to existing .gitignore', async () => {
    await writeFile(join(tempDir, '.gitignore'), 'node_modules\n');
    ensureGitignore(tempDir);
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules');
    expect(content).toContain('.DS_Store');
  });

  it('does not duplicate existing patterns', async () => {
    await writeFile(join(tempDir, '.gitignore'), '.DS_Store\n');
    ensureGitignore(tempDir);
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    const occurrences = content.split('.DS_Store').length - 1;
    expect(occurrences).toBe(1);
  });

  it('handles .gitignore without trailing newline', async () => {
    await writeFile(join(tempDir, '.gitignore'), 'node_modules');
    ensureGitignore(tempDir);
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toBe('node_modules\n.DS_Store\n');
  });
});

// ---------------------------------------------------------------------------
// getRepoRemoteUrl
// ---------------------------------------------------------------------------
describe('getRepoRemoteUrl', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns fetch URL when origin remote exists', async () => {
    mockGit.getRemotes.mockResolvedValue([
      { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git', push: 'https://github.com/user/repo.git' } },
    ]);

    const url = await getRepoRemoteUrl('/fake/dir');
    expect(url).toBe('https://github.com/user/repo.git');
  });

  it('returns null when no remotes exist', async () => {
    mockGit.getRemotes.mockResolvedValue([]);

    const url = await getRepoRemoteUrl('/fake/dir');
    expect(url).toBeNull();
  });

  it('returns null when origin remote is missing but others exist', async () => {
    mockGit.getRemotes.mockResolvedValue([
      { name: 'upstream', refs: { fetch: 'https://github.com/other/repo.git', push: 'https://github.com/other/repo.git' } },
    ]);

    const url = await getRepoRemoteUrl('/fake/dir');
    expect(url).toBeNull();
  });

  it('returns null on error', async () => {
    mockGit.getRemotes.mockRejectedValue(new Error('not a git repo'));

    const url = await getRepoRemoteUrl('/fake/dir');
    expect(url).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pushSkills
// ---------------------------------------------------------------------------
describe('pushSkills', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'push-test-'));
    vi.resetAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('stages, commits, and pushes on happy path', async () => {
    mockGit.status.mockResolvedValue({ isClean: () => false });
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue(undefined);
    mockGit.push.mockResolvedValue(undefined);
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    mockGit.raw.mockResolvedValue('1\n');

    const result = await pushSkills(tempDir, 'test commit');

    expect(mockGit.add).toHaveBeenCalledWith('-A');
    expect(mockGit.commit).toHaveBeenCalledWith('test commit');
    expect(mockGit.push).toHaveBeenCalledWith('origin', 'main', { '--set-upstream': null });
    expect(result).toEqual({ committed: true, pushed: true });
  });

  it('skips commit and push when working tree is clean and not ahead of remote', async () => {
    mockGit.add.mockResolvedValue(undefined);
    mockGit.status.mockResolvedValue({ isClean: () => true });
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    mockGit.raw.mockResolvedValue('0\n');

    const result = await pushSkills(tempDir);

    expect(mockGit.commit).not.toHaveBeenCalled();
    expect(mockGit.push).not.toHaveBeenCalled();
    expect(result.committed).toBe(false);
    expect(result.pushed).toBe(false);
  });

  it('pushes unpushed commits when working tree is clean but local is ahead of remote', async () => {
    mockGit.add.mockResolvedValue(undefined);
    mockGit.status.mockResolvedValue({ isClean: () => true });
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    mockGit.raw.mockResolvedValue('2\n');
    mockGit.push.mockResolvedValue(undefined);

    const result = await pushSkills(tempDir);

    expect(mockGit.commit).not.toHaveBeenCalled();
    expect(mockGit.push).toHaveBeenCalledWith('origin', 'main', { '--set-upstream': null });
    expect(result.committed).toBe(false);
    expect(result.pushed).toBe(true);
  });

  it('commits and pushes on first push when remote branch does not exist yet', async () => {
    mockGit.status.mockResolvedValue({ isClean: () => false });
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue(undefined);
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    // rev-list origin/main..HEAD fails, then rev-list HEAD --count returns commit count
    mockGit.raw
      .mockRejectedValueOnce(new Error('unknown revision origin/main'))
      .mockResolvedValueOnce('1\n');
    mockGit.push.mockResolvedValue(undefined);

    const result = await pushSkills(tempDir, 'initial');

    expect(mockGit.commit).toHaveBeenCalledWith('initial');
    expect(mockGit.push).toHaveBeenCalledWith('origin', 'main', { '--set-upstream': null });
    expect(result).toEqual({ committed: true, pushed: true });
  });

  it('pushes existing commits when tree is clean but remote branch never existed', async () => {
    // User scenario: first push committed but failed to push (no gh cli/remote repo),
    // then user installs gh cli + creates remote, runs push again — tree is clean but
    // local has commits that were never pushed
    mockGit.add.mockResolvedValue(undefined);
    mockGit.status.mockResolvedValue({ isClean: () => true });
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    // rev-list origin/main..HEAD fails (no remote branch), rev-list HEAD --count shows commits exist
    mockGit.raw
      .mockRejectedValueOnce(new Error('unknown revision origin/main'))
      .mockResolvedValueOnce('3\n');
    mockGit.push.mockResolvedValue(undefined);

    const result = await pushSkills(tempDir);

    expect(mockGit.commit).not.toHaveBeenCalled();
    expect(mockGit.push).toHaveBeenCalledWith('origin', 'main', { '--set-upstream': null });
    expect(result.committed).toBe(false);
    expect(result.pushed).toBe(true);
  });

  it('uses token with temporary remote URL and restores clean URL', async () => {
    mockGit.status.mockResolvedValue({ isClean: () => false });
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue(undefined);
    mockGit.push.mockResolvedValue(undefined);
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    mockGit.raw.mockResolvedValue('1\n');
    mockGit.getRemotes.mockResolvedValue([
      { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git', push: 'https://github.com/user/repo.git' } },
    ]);
    mockGit.remote.mockResolvedValue(undefined);

    await pushSkills(tempDir, 'test', 'ghp_token123');

    expect(mockGit.remote).toHaveBeenCalledTimes(2);
    expect(mockGit.remote).toHaveBeenNthCalledWith(1, ['set-url', 'origin', 'https://x-access-token:ghp_token123@github.com/user/repo.git']);
    expect(mockGit.remote).toHaveBeenNthCalledWith(2, ['set-url', 'origin', 'https://github.com/user/repo.git']);
  });

  it('throws when token is provided but origin remote URL is empty', async () => {
    mockGit.status.mockResolvedValue({ isClean: () => false });
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue(undefined);
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    mockGit.raw.mockResolvedValue('1\n');
    mockGit.getRemotes.mockResolvedValue([
      { name: 'origin', refs: { fetch: '', push: '' } },
    ]);

    await expect(pushSkills(tempDir, 'test', 'ghp_token')).rejects.toThrow(/No origin remote URL configured/);
    expect(mockGit.push).not.toHaveBeenCalled();
    expect(mockGit.remote).not.toHaveBeenCalled();
  });

  it('pushes without token when token is null', async () => {
    mockGit.status.mockResolvedValue({ isClean: () => false });
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue(undefined);
    mockGit.push.mockResolvedValue(undefined);
    mockGit.branchLocal.mockResolvedValue({ current: 'master' });
    mockGit.raw.mockResolvedValue('1\n');

    await pushSkills(tempDir, 'test', null);

    expect(mockGit.remote).not.toHaveBeenCalled();
    expect(mockGit.push).toHaveBeenCalledWith('origin', 'master', { '--set-upstream': null });
  });

  it('uses auto-generated commit message when none provided', async () => {
    mockGit.status.mockResolvedValue({ isClean: () => false });
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue(undefined);
    mockGit.push.mockResolvedValue(undefined);
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    mockGit.raw.mockResolvedValue('1\n');

    await pushSkills(tempDir);

    const commitCall = mockGit.commit.mock.calls[0][0] as string;
    expect(commitCall).toMatch(/^backup:/);
  });

  it('throws user-friendly error when push is rejected due to non-fast-forward (no token)', async () => {
    mockGit.status.mockResolvedValue({ isClean: () => false });
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue(undefined);
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    mockGit.raw.mockResolvedValue('1\n');
    mockGit.push.mockRejectedValue(new Error('error: failed to push some refs... non-fast-forward'));

    await expect(pushSkills(tempDir, 'test')).rejects.toThrow('Push rejected');
    await expect(pushSkills(tempDir, 'test')).rejects.toThrow('sm pull');
  });

  it('throws user-friendly error when push is rejected due to fetch first (with token)', async () => {
    mockGit.status.mockResolvedValue({ isClean: () => false });
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue(undefined);
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    mockGit.raw.mockResolvedValue('1\n');
    mockGit.getRemotes.mockResolvedValue([
      { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git', push: 'https://github.com/user/repo.git' } },
    ]);
    mockGit.remote.mockResolvedValue(undefined);
    mockGit.push.mockRejectedValue(new Error('hint: Updates were rejected because the remote contains work... fetch first'));

    await expect(pushSkills(tempDir, 'test', 'ghp_token123')).rejects.toThrow('Push rejected');
  });

  it('still restores clean URL when push conflict occurs with token', async () => {
    mockGit.status.mockResolvedValue({ isClean: () => false });
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue(undefined);
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    mockGit.raw.mockResolvedValue('1\n');
    mockGit.getRemotes.mockResolvedValue([
      { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git', push: 'https://github.com/user/repo.git' } },
    ]);
    mockGit.remote.mockResolvedValue(undefined);
    mockGit.push.mockRejectedValue(new Error('rejected non-fast-forward'));

    await expect(pushSkills(tempDir, 'test', 'ghp_token')).rejects.toThrow('Push rejected');

    // Verify clean URL was restored (last remote call should restore clean URL)
    const remoteCalls = mockGit.remote.mock.calls;
    expect(remoteCalls[remoteCalls.length - 1][0]).toEqual(['set-url', 'origin', 'https://github.com/user/repo.git']);
  });

  it('re-throws non-conflict push errors as-is', async () => {
    mockGit.status.mockResolvedValue({ isClean: () => false });
    mockGit.add.mockResolvedValue(undefined);
    mockGit.commit.mockResolvedValue(undefined);
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    mockGit.raw.mockResolvedValue('1\n');
    mockGit.push.mockRejectedValue(new Error('network timeout'));

    await expect(pushSkills(tempDir, 'test')).rejects.toThrow('network timeout');
  });
});

// ---------------------------------------------------------------------------
// pullSkills
// ---------------------------------------------------------------------------
describe('pullSkills', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'pull-test-'));
    vi.resetAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('clones when no .git directory exists', async () => {
    mockGit.clone.mockResolvedValue(undefined);
    // Remove tempDir so it looks like a non-existent target
    await rm(tempDir, { recursive: true, force: true });

    const result = await pullSkills(tempDir, 'https://github.com/user/repo.git');

    expect(mockGit.clone).toHaveBeenCalledWith('https://github.com/user/repo.git', tempDir);
    expect(result).toEqual({ cloned: true, pulled: false });
  });

  it('clones with auth URL and resets remote when token provided', async () => {
    mockGit.clone.mockResolvedValue(undefined);
    mockGit.remote.mockResolvedValue(undefined);
    await rm(tempDir, { recursive: true, force: true });

    await pullSkills(tempDir, 'https://github.com/user/repo.git', 'ghp_token456');

    expect(mockGit.clone).toHaveBeenCalledWith(
      'https://x-access-token:ghp_token456@github.com/user/repo.git',
      tempDir,
    );
    expect(mockGit.remote).toHaveBeenCalledWith(['set-url', 'origin', 'https://github.com/user/repo.git']);
  });

  it('pulls when .git directory exists', async () => {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(tempDir, '.git'));

    mockGit.fetch.mockResolvedValue(undefined);
    mockGit.raw.mockResolvedValue('HEAD branch: main\n');
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    // Simulate HEAD changed after pull
    mockGit.revparse.mockResolvedValueOnce('aaa111').mockResolvedValueOnce('bbb222');
    mockGit.pull.mockResolvedValue(undefined);

    const result = await pullSkills(tempDir, 'https://github.com/user/repo.git');

    expect(mockGit.fetch).toHaveBeenCalledWith('origin');
    expect(mockGit.pull).toHaveBeenCalledWith('origin', 'main', { '--rebase': null });
    expect(result).toEqual({ cloned: false, pulled: true });
  });

  it('checks out target branch with -B when HEAD is detached', async () => {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(tempDir, '.git'));

    mockGit.fetch.mockResolvedValue(undefined);
    mockGit.raw.mockResolvedValue('HEAD branch: main\n');
    // Simulate detached HEAD (current is a commit hash)
    mockGit.branchLocal.mockResolvedValue({ current: 'a1b2c3d' });
    mockGit.checkout.mockResolvedValue(undefined);
    // Simulate HEAD changed after pull
    mockGit.revparse.mockResolvedValueOnce('aaa111').mockResolvedValueOnce('bbb222');
    mockGit.pull.mockResolvedValue(undefined);

    await pullSkills(tempDir, 'https://github.com/user/repo.git');

    expect(mockGit.checkout).toHaveBeenCalledWith(['-B', 'main', 'origin/main']);
  });

  it('falls back to plain checkout when origin/branch does not exist', async () => {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(tempDir, '.git'));

    mockGit.fetch.mockResolvedValue(undefined);
    mockGit.raw.mockResolvedValue('HEAD branch: main\n');
    mockGit.branchLocal.mockResolvedValue({ current: '' });
    // First checkout (-B) fails, second (plain) succeeds
    mockGit.checkout
      .mockRejectedValueOnce(new Error('fatal: not a valid object name: origin/main'))
      .mockResolvedValueOnce(undefined);
    mockGit.revparse.mockResolvedValueOnce('aaa111').mockResolvedValueOnce('bbb222');
    mockGit.pull.mockResolvedValue(undefined);

    await pullSkills(tempDir, 'https://github.com/user/repo.git');

    expect(mockGit.checkout).toHaveBeenNthCalledWith(1, ['-B', 'main', 'origin/main']);
    expect(mockGit.checkout).toHaveBeenNthCalledWith(2, 'main');
  });

  it('fetches with auth URL when token is provided', async () => {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(tempDir, '.git'));

    mockGit.fetch.mockResolvedValue(undefined);
    mockGit.getRemotes.mockResolvedValue([
      { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git', push: 'https://github.com/user/repo.git' } },
    ]);
    mockGit.remote.mockResolvedValue(undefined);
    mockGit.raw.mockResolvedValue('HEAD branch: master\n');
    mockGit.branchLocal.mockResolvedValue({ current: 'master' });
    mockGit.revparse.mockResolvedValueOnce('aaa111').mockResolvedValueOnce('bbb222');
    mockGit.pull.mockResolvedValue(undefined);

    await pullSkills(tempDir, 'https://github.com/user/repo.git', 'ghp_token789');

    // Auth URL set before fetch, restored after fetch, then set again before pull, restored after pull
    expect(mockGit.remote).toHaveBeenCalledWith(['set-url', 'origin', 'https://x-access-token:ghp_token789@github.com/user/repo.git']);
    expect(mockGit.remote).toHaveBeenCalledWith(['set-url', 'origin', 'https://github.com/user/repo.git']);
    expect(mockGit.fetch).toHaveBeenCalledWith('origin');
    expect(mockGit.pull).toHaveBeenCalledWith('origin', 'master', { '--rebase': null });
  });

  it('aborts rebase and throws user-friendly error when pull hits conflicts', async () => {
    await mkdir(join(tempDir, '.git'));

    mockGit.fetch.mockResolvedValue(undefined);
    mockGit.raw.mockResolvedValue('HEAD branch: main\n');
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    mockGit.revparse.mockResolvedValue('aaa111');
    mockGit.pull.mockRejectedValue(new Error('CONFLICT (content): Merge conflict in skills/test'));
    mockGit.rebase.mockResolvedValue(undefined);

    await expect(pullSkills(tempDir, 'https://github.com/user/repo.git')).rejects.toThrow(/Rebase conflict detected/);
    expect(mockGit.rebase).toHaveBeenCalledWith(['--abort']);
  });

  it('falls back to local branch when remote default branch is unavailable (offline)', async () => {
    await mkdir(join(tempDir, '.git'));

    mockGit.fetch.mockResolvedValue(undefined);
    mockGit.raw.mockRejectedValue(new Error('offline'));
    mockGit.branchLocal.mockResolvedValue({ current: 'develop' });
    mockGit.revparse.mockResolvedValueOnce('aaa111').mockResolvedValueOnce('bbb222');
    mockGit.pull.mockResolvedValue(undefined);

    await pullSkills(tempDir, 'https://github.com/user/repo.git');

    expect(mockGit.pull).toHaveBeenCalledWith('origin', 'develop', { '--rebase': null });
  });

  it('returns pulled: false when pull brings no changes (HEAD unchanged)', async () => {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(tempDir, '.git'));

    mockGit.fetch.mockResolvedValue(undefined);
    mockGit.raw.mockResolvedValue('HEAD branch: main\n');
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    // Simulate HEAD unchanged: revparse returns same hash before and after pull
    mockGit.revparse.mockResolvedValue('abc1234def5678');
    mockGit.pull.mockResolvedValue(undefined);

    const result = await pullSkills(tempDir, 'https://github.com/user/repo.git');

    expect(mockGit.pull).toHaveBeenCalledWith('origin', 'main', { '--rebase': null });
    expect(result).toEqual({ cloned: false, pulled: false });
  });

  it('returns pulled: true when pull brings new changes (HEAD changed)', async () => {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(tempDir, '.git'));

    mockGit.fetch.mockResolvedValue(undefined);
    mockGit.raw.mockResolvedValue('HEAD branch: main\n');
    mockGit.branchLocal.mockResolvedValue({ current: 'main' });
    // Simulate HEAD changed: revparse returns different hash before and after pull
    mockGit.revparse.mockResolvedValueOnce('abc1234def5678').mockResolvedValueOnce('999beef000111');
    mockGit.pull.mockResolvedValue(undefined);

    const result = await pullSkills(tempDir, 'https://github.com/user/repo.git');

    expect(result).toEqual({ cloned: false, pulled: true });
  });
});

// ---------------------------------------------------------------------------
// ensureGitRepo
// ---------------------------------------------------------------------------
describe('ensureGitRepo', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ensure-git-test-'));
    vi.resetAllMocks();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns { initialized: false } when .git already exists', async () => {
    await mkdir(join(tempDir, '.git'));

    const result = await ensureGitRepo(tempDir);

    expect(result).toEqual({ initialized: false });
    expect(mockGit.init).not.toHaveBeenCalled();
  });

  it('runs git init and returns { initialized: true } when no .git directory', async () => {
    mockGit.init.mockResolvedValue(undefined);

    const result = await ensureGitRepo(tempDir);

    expect(mockGit.init).toHaveBeenCalled();
    expect(result).toEqual({ initialized: true });
  });

  it('creates the directory if it does not exist', async () => {
    const nonexistent = join(tempDir, 'subdir');
    mockGit.init.mockResolvedValue(undefined);

    await ensureGitRepo(nonexistent);

    expect(existsSync(nonexistent)).toBe(true);
    expect(mockGit.init).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// ensureRemote
// ---------------------------------------------------------------------------
describe('ensureRemote', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns existing remote URL when origin is already configured', async () => {
    mockGit.getRemotes.mockResolvedValue([
      { name: 'origin', refs: { fetch: 'https://github.com/user/repo.git', push: 'https://github.com/user/repo.git' } },
    ]);

    const result = await ensureRemote('/fake/dir', 'owner/new-repo');

    expect(result).toEqual({ remoteUrl: 'https://github.com/user/repo.git', added: false });
    expect(mockGit.remote).not.toHaveBeenCalled();
  });

  it('adds origin remote when none exists', async () => {
    mockGit.getRemotes.mockResolvedValue([]);
    mockGit.remote.mockResolvedValue(undefined);

    const result = await ensureRemote('/fake/dir', 'owner/new-repo');

    expect(mockGit.remote).toHaveBeenCalledWith(['add', 'origin', 'https://github.com/owner/new-repo.git']);
    expect(result).toEqual({ remoteUrl: 'https://github.com/owner/new-repo.git', added: true });
  });
});

// ---------------------------------------------------------------------------
// createGitHubRepo
// ---------------------------------------------------------------------------
describe('createGitHubRepo', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('runs gh repo create with --private flag', () => {
    mockExecSync.mockReturnValue(Buffer.from(''));

    createGitHubRepo('owner/my-skills');

    expect(mockExecSync).toHaveBeenCalledWith(
      'gh repo create owner/my-skills --private --confirm',
      expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
    );
  });

  it('runs gh repo create with --public flag when public option set', () => {
    mockExecSync.mockReturnValue(Buffer.from(''));

    createGitHubRepo('owner/my-skills', { isPublic: true });

    expect(mockExecSync).toHaveBeenCalledWith(
      'gh repo create owner/my-skills --public --confirm',
      expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
    );
  });

  it('throws when gh repo create fails', () => {
    mockExecSync.mockImplementation(() => { throw new Error('gh: command not found'); });

    expect(() => createGitHubRepo('owner/my-skills')).toThrow('Failed to create GitHub repository');
  });
});

// ---------------------------------------------------------------------------
// isGhInstalled
// ---------------------------------------------------------------------------
describe('isGhInstalled', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns true when gh --version succeeds', () => {
    mockExecSync.mockReturnValue('gh version 2.40.0');

    expect(isGhInstalled()).toBe(true);
    expect(mockExecSync).toHaveBeenCalledWith(
      'gh --version',
      expect.objectContaining({ stdio: ['pipe', 'pipe', 'pipe'] }),
    );
  });

  it('returns false when gh is not installed', () => {
    mockExecSync.mockImplementation(() => { throw new Error('command not found: gh'); });

    expect(isGhInstalled()).toBe(false);
  });
});
