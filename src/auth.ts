// src/auth.ts
import { execSync, spawnSync } from 'node:child_process';
import * as p from '@clack/prompts';
import { CliError } from './errors.js';

/**
 * Get GitHub token. Priority: gh auth token > GITHUB_TOKEN > GH_TOKEN.
 * Returns null if none available.
 */
export function getGitHubToken(): string | null {
  // Try gh CLI first
  try {
    const token = execSync('gh auth token', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (token) return token;
  } catch {
    // gh not installed or not authenticated
  }

  // Fallback to env vars
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;

  return null;
}

/**
 * Ensure a GitHub token is available. If not, interactively guide the user
 * through authentication. Returns token or throws CliError.
 */
export async function ensureGitHubToken(): Promise<string> {
  const existing = getGitHubToken();
  if (existing) return existing;

  const method = await p.select({
    message: 'No GitHub authentication found. How would you like to authenticate?',
    options: [
      { value: 'gh', label: 'Run gh auth login', hint: 'recommended — opens GitHub CLI login flow' },
      { value: 'env', label: 'Set GITHUB_TOKEN manually', hint: 'export GITHUB_TOKEN=ghp_...' },
    ],
  });

  if (p.isCancel(method)) {
    p.cancel('Authentication cancelled.');
    throw new CliError('Authentication cancelled.');
  }

  if (method === 'gh') {
    p.log.step('Starting gh auth login...');
    const result = spawnSync('gh', ['auth', 'login'], {
      stdio: 'inherit',
    });

    if (result.status !== 0) {
      p.cancel('gh auth login failed. Please try again.');
      throw new CliError('gh auth login failed.');
    }

    const token = getGitHubToken();
    if (!token) {
      p.cancel('Still no token after gh auth login. Please try again.');
      throw new CliError('No token after gh auth login.');
    }
    return token;
  }

  // method === 'env'
  p.note(
    'Run one of the following, then re-run your command:\n\n' +
    '  export GITHUB_TOKEN=ghp_your_token_here\n' +
    '  export GH_TOKEN=ghp_your_token_here',
    'Set environment variable',
  );
  throw new CliError('Please set GITHUB_TOKEN and try again.');
}
