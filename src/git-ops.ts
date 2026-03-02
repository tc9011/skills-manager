// src/git-ops.ts
import { simpleGit, type SimpleGit } from 'simple-git';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Build a clean GitHub HTTPS remote URL (no embedded credentials).
 */
export function buildRemoteUrl(repo: string): string {
  return `https://github.com/${repo}.git`;
}

/**
 * Build an authenticated URL for transient use (clone/push/pull).
 * NEVER persist this — use only in-memory for git operations.
 */
function buildAuthUrl(cleanUrl: string, token: string | null): string {
  if (!token) return cleanUrl;
  // Insert token into https://github.com/... → https://x-access-token:TOKEN@github.com/...
  return cleanUrl.replace('https://', `https://x-access-token:${token}@`);
}

/**
 * Check if a git repo has uncommitted changes.
 */
export async function hasUncommittedChanges(dir: string): Promise<boolean> {
  const git = simpleGit(dir);
  const status = await git.status();
  return !status.isClean();
}

/**
 * Get the remote URL of an existing repo (origin).
 */
export async function getRepoRemoteUrl(dir: string): Promise<string | null> {
  try {
    const git = simpleGit(dir);
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');
    return origin?.refs.fetch ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the current branch name of a repo.
 */
async function getCurrentBranch(git: SimpleGit): Promise<string> {
  const branch = await git.branchLocal();
  return branch.current || 'main';
}

/**
 * Push: stage all changes, commit with timestamp, push to remote.
 * Uses token transiently via in-memory authenticated URL — never persisted to .git/config.
 */
export async function pushSkills(
  dir: string,
  message?: string,
  token?: string | null,
): Promise<{ committed: boolean; pushed: boolean }> {
  const git = simpleGit(dir);
  const msg = message ?? `backup: ${new Date().toISOString()}`;

  // Stage all
  await git.add('-A');

  // Check if anything to commit
  const status = await git.status();
  if (status.isClean()) {
    return { committed: false, pushed: false };
  }

  // Commit
  await git.commit(msg);

  // Push — if token provided, temporarily set the remote URL with auth, then restore
  const branch = await getCurrentBranch(git);
  if (token) {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');
    const cleanUrl = origin?.refs.push ?? origin?.refs.fetch ?? '';
    const authUrl = buildAuthUrl(cleanUrl, token);
    try {
      await git.remote(['set-url', 'origin', authUrl]);
      await git.push('origin', branch);
    } finally {
      // Always restore the clean URL
      await git.remote(['set-url', 'origin', cleanUrl]);
    }
  } else {
    await git.push('origin', branch);
  }

  return { committed: true, pushed: true };
}

/**
 * Pull: clone if not exists, pull if exists.
 * Uses token transiently — after clone, resets remote to clean URL.
 */
export async function pullSkills(
  dir: string,
  remoteUrl: string,
  token?: string | null,
): Promise<{ cloned: boolean; pulled: boolean }> {
  const isRepo = existsSync(join(dir, '.git'));

  if (!isRepo) {
    // Clone with auth URL, then reset remote to clean URL
    const authUrl = buildAuthUrl(remoteUrl, token ?? null);
    await simpleGit().clone(authUrl, dir);

    if (token) {
      // Reset remote to clean URL so token isn't persisted in .git/config
      const git = simpleGit(dir);
      await git.remote(['set-url', 'origin', remoteUrl]);
    }

    return { cloned: true, pulled: false };
  }

  // Pull latest — temporarily set auth URL if needed
  const git = simpleGit(dir);
  const branch = await getCurrentBranch(git);

  if (token) {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');
    const cleanUrl = origin?.refs.fetch ?? remoteUrl;
    const authUrl = buildAuthUrl(cleanUrl, token);
    try {
      await git.remote(['set-url', 'origin', authUrl]);
      await git.pull('origin', branch);
    } finally {
      await git.remote(['set-url', 'origin', cleanUrl]);
    }
  } else {
    await git.pull('origin', branch);
  }

  return { cloned: false, pulled: true };
}
