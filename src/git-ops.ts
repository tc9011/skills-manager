// src/git-ops.ts
import { simpleGit, type SimpleGit } from 'simple-git';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Build a GitHub remote URL, optionally embedding a token for HTTPS auth.
 */
export function buildRemoteUrl(repo: string, token: string | null): string {
  if (token) {
    return `https://${token}@github.com/${repo}.git`;
  }
  return `https://github.com/${repo}.git`;
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
 * Push: stage all changes, commit with timestamp, push to remote.
 * Assumes the directory is already a git repo with a remote.
 */
export async function pushSkills(
  dir: string,
  message?: string,
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

  // Commit and push
  await git.commit(msg);
  await git.push('origin', 'main');
  return { committed: true, pushed: true };
}

/**
 * Pull: clone if not exists, pull if exists.
 * Returns the directory path.
 */
export async function pullSkills(
  dir: string,
  remoteUrl: string,
): Promise<{ cloned: boolean; pulled: boolean }> {
  const isRepo = existsSync(join(dir, '.git'));

  if (!isRepo) {
    // Clone into the directory
    await simpleGit().clone(remoteUrl, dir);
    return { cloned: true, pulled: false };
  }

  // Pull latest
  const git = simpleGit(dir);
  await git.pull('origin', 'main');
  return { cloned: false, pulled: true };
}
