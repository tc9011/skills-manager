// src/auth.ts
import { execSync } from 'node:child_process';

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
