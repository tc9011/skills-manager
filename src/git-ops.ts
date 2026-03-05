// src/git-ops.ts
import { simpleGit, type SimpleGit } from 'simple-git';
import { existsSync, readdirSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Build a clean GitHub HTTPS remote URL (no embedded credentials).
 */
export function buildRemoteUrl(repo: string): string {
  return `https://github.com/${repo}.git`;
}

/** Patterns that suggest secret or credential files. */
const SUSPICIOUS_PATTERNS = [
  /^\.env/,
  /\.key$/,
  /\.pem$/,
  /credentials/i,
  /secret/i,
  /token/i,
];

/**
 * Scan a directory (non-recursive) for files that look like secrets.
 * Returns an array of suspicious filenames.
 */
export function detectSuspiciousFiles(dir: string): string[] {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && SUSPICIOUS_PATTERNS.some(p => p.test(e.name)))
      .map(e => e.name);
  } catch {
    return [];
  }
}

/** Default patterns that should always be in .gitignore for a skills repo. */
const GITIGNORE_DEFAULTS = ['.DS_Store'];

/**
 * Ensure a .gitignore exists in the skills repo with sensible defaults.
 * Appends missing entries without overwriting user content.
 */
export function ensureGitignore(dir: string): void {
  const gitignorePath = join(dir, '.gitignore');
  let existing = '';
  if (existsSync(gitignorePath)) {
    existing = readFileSync(gitignorePath, 'utf-8');
  }
  const lines = existing.split('\n').map(l => l.trim());
  const missing = GITIGNORE_DEFAULTS.filter(p => !lines.includes(p));
  if (missing.length > 0) {
    const suffix = existing.endsWith('\n') || existing === '' ? '' : '\n';
    appendFileSync(gitignorePath, suffix + missing.join('\n') + '\n', 'utf-8');
  }
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
  const current = branch.current || '';
  // Detached HEAD: simple-git returns a commit hash or empty string.
  // A valid branch name won't be a 7-40 char hex string.
  if (!current || /^[0-9a-f]{7,40}$/.test(current)) {
    return 'main';
  }
  return current;
}

/**
 * Detect the remote's default branch (e.g. main vs master).
 * Falls back to the local branch name if remote info unavailable.
 */
async function getRemoteDefaultBranch(git: SimpleGit): Promise<string> {
  try {
    const raw = await git.raw(['remote', 'show', 'origin']);
    const match = raw.match(/HEAD branch:\s*(\S+)/);
    if (match?.[1]) return match[1];
  } catch {
    // remote show may fail without network; ignore
  }
  return getCurrentBranch(git);
}

/**
 * Push: stage all changes, commit with timestamp, push to remote.
 * Uses token transiently via in-memory authenticated URL — never persisted to .git/config.
 */
export async function pushSkills(
  dir: string,
  message?: string,
  token?: string | null,
): Promise<{ committed: boolean; pushed: boolean; suspiciousFiles?: string[] }> {
  const git = simpleGit(dir);
  const msg = message ?? `backup: ${new Date().toISOString()}`;

  // Warn about potential secrets before staging
  const suspicious = detectSuspiciousFiles(dir);

  // Stage all
  // Ensure .gitignore has sensible defaults (.DS_Store etc.)
  ensureGitignore(dir);

  await git.add('-A');
  // Check if anything to commit
  const status = await git.status();
  let committed = false;

  if (!status.isClean()) {
    // Commit
    await git.commit(msg);
    committed = true;
  }

  // Push — always check if local is ahead of remote (handles previously committed but unpushed work)
  const branch = await getCurrentBranch(git);
  let aheadCount: number;
  try {
    const count = await git.raw(['rev-list', `origin/${branch}..HEAD`, '--count']);
    aheadCount = parseInt(count.trim(), 10) || 0;
  } catch {
    // Remote branch may not exist yet (first push) — treat as ahead if we committed
    aheadCount = committed ? 1 : 0;
  }

  if (aheadCount === 0) {
    return { committed: false, pushed: false, suspiciousFiles: suspicious.length > 0 ? suspicious : undefined };
  }
  const doPush = async () => {
    try {
      await git.push('origin', branch, { '--set-upstream': null });
    } catch (err) {
      const msg = String(err);
      if (msg.includes('non-fast-forward') || msg.includes('fetch first') || msg.includes('rejected') || msg.includes('failed to push')) {
        throw new Error(
          'Push rejected — remote contains commits that you do not have locally.\n'
          + 'Pull the latest changes first, resolve any conflicts, then push again:\n'
          + '  sm pull\n'
          + '  sm push\n'
          + '\n'
          + 'Or resolve manually:\n'
          + '  cd ~/.agents\n'
          + `  git pull --rebase origin ${branch}   # resolve conflicts if any, then git rebase --continue\n`
          + '  sm push',
          { cause: err },
        );
      }
      throw err;
    }
  };

  if (token) {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');
    const cleanUrl = origin?.refs.push ?? origin?.refs.fetch ?? '';
    if (!cleanUrl) {
      throw new Error('No origin remote URL configured — cannot push with authentication.');
    }
    const authUrl = buildAuthUrl(cleanUrl, token);
    try {
      await git.remote(['set-url', 'origin', authUrl]);
      await doPush();
    } finally {
      // Always restore the clean URL
      await git.remote(['set-url', 'origin', cleanUrl]);
    }
  } else {
    await doPush();
  }

  return { committed, pushed: true, suspiciousFiles: suspicious.length > 0 ? suspicious : undefined };
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

  // Pull latest — use remote's default branch (handles main vs master)
  const git = simpleGit(dir);

  // Helper: temporarily set auth URL, run callback, then restore clean URL
  const withAuth = async <T>(fn: () => Promise<T>): Promise<T> => {
    if (!token) return fn();
    const remotes = await git.getRemotes(true);
    const origin = remotes.find((r) => r.name === 'origin');
    const cleanUrl = origin?.refs.fetch ?? remoteUrl;
    const authUrl = buildAuthUrl(cleanUrl, token);
    try {
      await git.remote(['set-url', 'origin', authUrl]);
      return await fn();
    } finally {
      await git.remote(['set-url', 'origin', cleanUrl]);
    }
  };

  // Fetch first so remote refs are available for branch detection and checkout
  await withAuth(() => git.fetch('origin'));

  const branch = await getRemoteDefaultBranch(git);

  // If HEAD is detached or no local branch, create/reset local branch from remote
  const localBranch = await git.branchLocal();
  if (!localBranch.current || /^[0-9a-f]{7,40}$/.test(localBranch.current)) {
    try {
      // -B creates the branch if missing, or resets it if it exists
      await git.checkout(['-B', branch, `origin/${branch}`]);
    } catch {
      // If origin/branch doesn't exist either, try plain checkout as last resort
      await git.checkout(branch);
    }
  }

  // Capture HEAD before pull to detect if anything changed
  const headBefore = await git.revparse(['HEAD']);

  const doPull = async () => {
    try {
      await git.pull('origin', branch, { '--rebase': null });
    } catch (err) {
      // If rebase conflicts, abort and give user a clear message
      const msg = String(err);
      if (msg.includes('CONFLICT') || msg.includes('could not apply')) {
        try { await git.rebase(['--abort']); } catch { /* already clean */ }
        throw new Error(
          'Rebase conflict detected. Your local skills have diverged from the remote.\n'
          + 'To fix, cd into ~/.agents/ and resolve manually:\n'
          + '  cd ~/.agents\n'
          + '  git fetch origin\n'
          + `  git rebase origin/${branch}   # resolve conflicts, then git rebase --continue\n`
          + 'Or force-reset to remote (loses local changes):\n'
          + `  git reset --hard origin/${branch}`,
          { cause: err },
        );
      }
      throw err;
    }
  };

  await withAuth(doPull);

  // Compare HEAD after pull to detect if anything actually changed
  const headAfter = await git.revparse(['HEAD']);
  const hasChanges = headBefore !== headAfter;

  return { cloned: false, pulled: hasChanges };
}
/**
 * Ensure a directory is a git repository. If not, runs `git init`.
 * Creates the directory if it doesn't exist.
 */
export async function ensureGitRepo(dir: string): Promise<{ initialized: boolean }> {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (existsSync(join(dir, '.git'))) {
    return { initialized: false };
  }

  const git = simpleGit(dir);
  await git.init();
  return { initialized: true };
}

/**
 * Ensure origin remote is configured. If not, add it from the given repo slug.
 * Returns the remote URL and whether it was newly added.
 */
export async function ensureRemote(
  dir: string,
  repo: string,
): Promise<{ remoteUrl: string; added: boolean }> {
  const git = simpleGit(dir);
  const remotes = await git.getRemotes(true);
  const origin = remotes.find((r) => r.name === 'origin');

  if (origin?.refs.fetch) {
    return { remoteUrl: origin.refs.fetch, added: false };
  }

  const remoteUrl = buildRemoteUrl(repo);
  await git.remote(['add', 'origin', remoteUrl]);
  return { remoteUrl, added: true };
}

/**
 * Check whether the `gh` CLI is available on the system PATH.
 */
export function isGhInstalled(): boolean {
  try {
    execSync('gh --version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}


/**
 * Create a GitHub repository using the `gh` CLI.
 * Throws if `gh` is not installed or the command fails.
 */
export function createGitHubRepo(
  repo: string,
  options?: { isPublic?: boolean },
): void {
  const visibility = options?.isPublic ? '--public' : '--private';
  try {
    execSync(`gh repo create ${repo} ${visibility} --confirm`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    throw new Error(`Failed to create GitHub repository '${repo}': ${String(err)}`, { cause: err });
  }
}
