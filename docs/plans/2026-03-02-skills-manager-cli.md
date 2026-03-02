# Skills Manager CLI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Node.js CLI tool that backs up skills from `~/.agents/skills/` to a GitHub repo (`push`), restores them (`pull`), and re-creates agent symlinks based on `.skill-lock.json`'s `lastSelectedAgents` field.

**Architecture:** Three commands — `push` (git add/commit/push canonical skills to GitHub), `pull` (git clone/pull from GitHub to canonical location), and `link` (read `.skill-lock.json`, interactively confirm agents, create symlinks). `pull` automatically runs `link` after restoring files. The agent registry is a hardcoded map of 41 agents from vercel-labs/skills. Authentication reuses `gh auth token` with fallback to `$GITHUB_TOKEN`.

**Tech Stack:** Node.js + TypeScript, tsx for execution, Commander.js for CLI, simple-git for git operations, `@clack/prompts` for interactive UX, vitest for TDD.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/index.ts` (entry point — empty shell)
- Create: `.gitignore`

**Step 1: Create package.json**

```json
{
  "name": "skills-manager",
  "version": "0.1.0",
  "description": "Backup and restore AI agent skills to GitHub",
  "type": "module",
  "bin": {
    "skills-manager": "./dist/index.js"
  },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": {
    "node": ">=20"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "vitest": "^3.0.0",
    "@types/node": "^22.0.0"
  },
  "dependencies": {
    "commander": "^13.0.0",
    "simple-git": "^3.27.0",
    "@clack/prompts": "^0.10.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
.DS_Store
```

**Step 5: Create src/index.ts (empty shell)**

```typescript
#!/usr/bin/env node
// Skills Manager CLI — entry point
```

**Step 6: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, lock file generated, exit 0

**Step 7: Verify test runner works**

Run: `npx vitest run`
Expected: "No test files found" or similar — confirms vitest is wired up

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold skills-manager CLI project"
```

---

### Task 2: Agent Registry

**Files:**
- Create: `src/agents.ts`
- Create: `src/agents.test.ts`

**Step 1: Write the failing test**

```typescript
// src/agents.test.ts
import { describe, it, expect } from 'vitest';
import { agentRegistry, getAgentGlobalPath, type AgentId } from './agents.js';

describe('agentRegistry', () => {
  it('contains all 41 agents', () => {
    expect(Object.keys(agentRegistry)).toHaveLength(41);
  });

  it('includes all user lastSelectedAgents', () => {
    const required: AgentId[] = [
      'amp', 'cline', 'codex', 'cursor', 'gemini-cli',
      'github-copilot', 'kimi-cli', 'opencode',
      'antigravity', 'trae', 'pi', 'claude-code',
    ];
    for (const agent of required) {
      expect(agentRegistry[agent]).toBeDefined();
    }
  });

  it('universal agents share .agents/skills project path', () => {
    const universals = Object.entries(agentRegistry)
      .filter(([, v]) => v.universal);
    for (const [, agent] of universals) {
      expect(agent.projectPath).toBe('.agents/skills');
    }
  });

  it('non-universal agents have agent-specific project paths', () => {
    expect(agentRegistry['claude-code'].projectPath).toBe('.claude/skills');
    expect(agentRegistry.antigravity.projectPath).toBe('.agent/skills');
    expect(agentRegistry.windsurf.projectPath).toBe('.windsurf/skills');
  });
});

describe('getAgentGlobalPath', () => {
  it('resolves ~ to home directory', () => {
    const home = process.env.HOME!;
    const path = getAgentGlobalPath('cursor');
    expect(path).toBe(`${home}/.cursor/skills`);
  });

  it('resolves opencode with XDG_CONFIG_HOME fallback', () => {
    const home = process.env.HOME!;
    // Without XDG_CONFIG_HOME set, falls back to ~/.config
    const path = getAgentGlobalPath('opencode');
    expect(path).toBe(`${home}/.config/opencode/skills`);
  });

  it('resolves claude-code with CLAUDE_CONFIG_DIR fallback', () => {
    const home = process.env.HOME!;
    const path = getAgentGlobalPath('claude-code');
    expect(path).toBe(`${home}/.claude/skills`);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/agents.test.ts`
Expected: FAIL — module `./agents.js` not found

**Step 3: Write implementation**

Create `src/agents.ts` containing the full 41-agent registry (from librarian research). Key structure:

```typescript
// src/agents.ts
import { homedir } from 'node:os';
import { join } from 'node:path';

export type AgentId =
  | 'amp' | 'antigravity' | 'augment' | 'claude-code' | 'openclaw'
  | 'cline' | 'codebuddy' | 'codex' | 'command-code' | 'continue'
  | 'cortex' | 'crush' | 'cursor' | 'droid' | 'gemini-cli'
  | 'github-copilot' | 'goose' | 'junie' | 'iflow-cli' | 'kilo'
  | 'kimi-cli' | 'kiro-cli' | 'kode' | 'mcpjam' | 'mistral-vibe'
  | 'mux' | 'opencode' | 'openhands' | 'pi' | 'qoder'
  | 'qwen-code' | 'replit' | 'roo' | 'trae' | 'trae-cn'
  | 'windsurf' | 'zencoder' | 'neovate' | 'pochi' | 'adal' | 'universal';

export interface AgentPaths {
  displayName: string;
  projectPath: string;
  globalPath: string;       // uses ~ or env var placeholders
  universal: boolean;
}

export const agentRegistry: Record<AgentId, AgentPaths> = {
  // UNIVERSAL GROUP (.agents/skills)
  amp:              { displayName: 'Amp',              projectPath: '.agents/skills', globalPath: '~/.config/agents/skills',   universal: true },
  cline:            { displayName: 'Cline',            projectPath: '.agents/skills', globalPath: '~/.agents/skills',          universal: true },
  codex:            { displayName: 'Codex',            projectPath: '.agents/skills', globalPath: '$CODEX_HOME/skills',        universal: true },
  cursor:           { displayName: 'Cursor',           projectPath: '.agents/skills', globalPath: '~/.cursor/skills',          universal: true },
  'gemini-cli':     { displayName: 'Gemini CLI',       projectPath: '.agents/skills', globalPath: '~/.gemini/skills',          universal: true },
  'github-copilot': { displayName: 'GitHub Copilot',   projectPath: '.agents/skills', globalPath: '~/.copilot/skills',         universal: true },
  'kimi-cli':       { displayName: 'Kimi Code CLI',    projectPath: '.agents/skills', globalPath: '~/.config/agents/skills',   universal: true },
  opencode:         { displayName: 'OpenCode',         projectPath: '.agents/skills', globalPath: '$XDG_CONFIG_HOME/opencode/skills', universal: true },
  replit:           { displayName: 'Replit',            projectPath: '.agents/skills', globalPath: '~/.config/agents/skills',   universal: true },
  universal:        { displayName: 'Universal',        projectPath: '.agents/skills', globalPath: '~/.config/agents/skills',   universal: true },

  // NON-UNIVERSAL (agent-specific paths)
  antigravity:      { displayName: 'Antigravity',      projectPath: '.agent/skills',        globalPath: '~/.gemini/antigravity/skills',    universal: false },
  augment:          { displayName: 'Augment',          projectPath: '.augment/skills',      globalPath: '~/.augment/skills',               universal: false },
  'claude-code':    { displayName: 'Claude Code',      projectPath: '.claude/skills',       globalPath: '$CLAUDE_CONFIG_DIR/skills',       universal: false },
  openclaw:         { displayName: 'OpenClaw',         projectPath: 'skills',               globalPath: '~/.openclaw/skills',              universal: false },
  codebuddy:        { displayName: 'CodeBuddy',        projectPath: '.codebuddy/skills',    globalPath: '~/.codebuddy/skills',             universal: false },
  'command-code':   { displayName: 'Command Code',     projectPath: '.commandcode/skills',  globalPath: '~/.commandcode/skills',           universal: false },
  continue:         { displayName: 'Continue',         projectPath: '.continue/skills',     globalPath: '~/.continue/skills',              universal: false },
  cortex:           { displayName: 'Cortex Code',      projectPath: '.cortex/skills',       globalPath: '~/.snowflake/cortex/skills',      universal: false },
  crush:            { displayName: 'Crush',            projectPath: '.crush/skills',        globalPath: '~/.config/crush/skills',          universal: false },
  droid:            { displayName: 'Droid',            projectPath: '.factory/skills',      globalPath: '~/.factory/skills',               universal: false },
  goose:            { displayName: 'Goose',            projectPath: '.goose/skills',        globalPath: '~/.config/goose/skills',          universal: false },
  junie:            { displayName: 'Junie',            projectPath: '.junie/skills',        globalPath: '~/.junie/skills',                 universal: false },
  'iflow-cli':      { displayName: 'iFlow CLI',        projectPath: '.iflow/skills',        globalPath: '~/.iflow/skills',                 universal: false },
  kilo:             { displayName: 'Kilo Code',        projectPath: '.kilocode/skills',     globalPath: '~/.kilocode/skills',              universal: false },
  'kiro-cli':       { displayName: 'Kiro CLI',         projectPath: '.kiro/skills',         globalPath: '~/.kiro/skills',                  universal: false },
  kode:             { displayName: 'Kode',             projectPath: '.kode/skills',         globalPath: '~/.kode/skills',                  universal: false },
  mcpjam:           { displayName: 'MCPJam',           projectPath: '.mcpjam/skills',       globalPath: '~/.mcpjam/skills',                universal: false },
  'mistral-vibe':   { displayName: 'Mistral Vibe',     projectPath: '.vibe/skills',         globalPath: '~/.vibe/skills',                  universal: false },
  mux:              { displayName: 'Mux',              projectPath: '.mux/skills',          globalPath: '~/.mux/skills',                   universal: false },
  openhands:        { displayName: 'OpenHands',        projectPath: '.openhands/skills',    globalPath: '~/.openhands/skills',             universal: false },
  pi:               { displayName: 'Pi',               projectPath: '.pi/skills',           globalPath: '~/.pi/agent/skills',              universal: false },
  qoder:            { displayName: 'Qoder',            projectPath: '.qoder/skills',        globalPath: '~/.qoder/skills',                 universal: false },
  'qwen-code':      { displayName: 'Qwen Code',        projectPath: '.qwen/skills',         globalPath: '~/.qwen/skills',                  universal: false },
  roo:              { displayName: 'Roo Code',         projectPath: '.roo/skills',          globalPath: '~/.roo/skills',                   universal: false },
  trae:             { displayName: 'Trae',             projectPath: '.trae/skills',         globalPath: '~/.trae/skills',                  universal: false },
  'trae-cn':        { displayName: 'Trae CN',          projectPath: '.trae/skills',         globalPath: '~/.trae-cn/skills',               universal: false },
  windsurf:         { displayName: 'Windsurf',         projectPath: '.windsurf/skills',     globalPath: '~/.codeium/windsurf/skills',      universal: false },
  zencoder:         { displayName: 'Zencoder',         projectPath: '.zencoder/skills',     globalPath: '~/.zencoder/skills',              universal: false },
  neovate:          { displayName: 'Neovate',          projectPath: '.neovate/skills',      globalPath: '~/.neovate/skills',               universal: false },
  pochi:            { displayName: 'Pochi',            projectPath: '.pochi/skills',        globalPath: '~/.pochi/skills',                 universal: false },
  adal:             { displayName: 'AdaL',             projectPath: '.adal/skills',         globalPath: '~/.adal/skills',                  universal: false },
};

/**
 * Resolve an agent's global skills path to an absolute filesystem path.
 * Handles ~, $XDG_CONFIG_HOME, $CODEX_HOME, $CLAUDE_CONFIG_DIR.
 */
export function getAgentGlobalPath(agentId: AgentId): string {
  const home = homedir();
  let p = agentRegistry[agentId].globalPath;

  // Resolve env-var-based paths first
  if (p.startsWith('$XDG_CONFIG_HOME')) {
    const xdg = process.env.XDG_CONFIG_HOME ?? join(home, '.config');
    p = p.replace('$XDG_CONFIG_HOME', xdg);
  } else if (p.startsWith('$CODEX_HOME')) {
    const codex = process.env.CODEX_HOME ?? join(home, '.codex');
    p = p.replace('$CODEX_HOME', codex);
  } else if (p.startsWith('$CLAUDE_CONFIG_DIR')) {
    const claude = process.env.CLAUDE_CONFIG_DIR ?? join(home, '.claude');
    p = p.replace('$CLAUDE_CONFIG_DIR', claude);
  } else if (p.startsWith('~')) {
    p = p.replace('~', home);
  }

  return p;
}

/** Canonical skills directory — the source of truth. */
export const CANONICAL_SKILLS_DIR = join(homedir(), '.agents', 'skills');

/** Lock file path — READ ONLY, owned by vercel-labs/skills. */
export const SKILL_LOCK_PATH = join(homedir(), '.agents', '.skill-lock.json');
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/agents.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add agent registry with 41 agents and path resolver"
```

---

### Task 3: Lock File Reader

**Files:**
- Create: `src/lockfile.ts`
- Create: `src/lockfile.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lockfile.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readLockFile, getLastSelectedAgents } from './lockfile.js';
import type { AgentId } from './agents.js';

// Mock fs to avoid reading real files in tests
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';
const mockReadFile = vi.mocked(readFile);

describe('readLockFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses valid lock file', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({
      version: 3,
      skills: {
        'my-skill': {
          source: 'user/repo',
          sourceType: 'github',
          sourceUrl: 'https://github.com/user/repo.git',
          skillFolderHash: 'abc123',
          installedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      lastSelectedAgents: ['opencode', 'claude-code'],
    }));

    const result = await readLockFile('/fake/path');
    expect(result).toBeDefined();
    expect(result!.version).toBe(3);
    expect(result!.lastSelectedAgents).toEqual(['opencode', 'claude-code']);
    expect(Object.keys(result!.skills)).toContain('my-skill');
  });

  it('returns null when file does not exist', async () => {
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockReadFile.mockRejectedValue(err);

    const result = await readLockFile('/nonexistent/path');
    expect(result).toBeNull();
  });

  it('throws on invalid JSON', async () => {
    mockReadFile.mockResolvedValue('not json{{{');
    await expect(readLockFile('/bad/path')).rejects.toThrow();
  });
});

describe('getLastSelectedAgents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns lastSelectedAgents filtered to valid AgentIds', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({
      version: 3,
      skills: {},
      lastSelectedAgents: ['opencode', 'claude-code', 'nonexistent-agent'],
    }));

    const agents = await getLastSelectedAgents('/fake/path');
    expect(agents).toEqual(['opencode', 'claude-code']);
  });

  it('returns empty array when lock file missing', async () => {
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    mockReadFile.mockRejectedValue(err);

    const agents = await getLastSelectedAgents('/fake/path');
    expect(agents).toEqual([]);
  });

  it('returns empty array when lastSelectedAgents is absent', async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({
      version: 3,
      skills: {},
    }));

    const agents = await getLastSelectedAgents('/fake/path');
    expect(agents).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lockfile.test.ts`
Expected: FAIL — module `./lockfile.js` not found

**Step 3: Write implementation**

```typescript
// src/lockfile.ts
import { readFile } from 'node:fs/promises';
import { agentRegistry, type AgentId } from './agents.js';

export interface SkillLockEntry {
  source: string;
  sourceType: string;
  sourceUrl: string;
  skillPath?: string;
  skillFolderHash: string;
  installedAt: string;
  updatedAt: string;
  pluginName?: string;
}

export interface SkillLockFile {
  version: number;
  skills: Record<string, SkillLockEntry>;
  dismissed?: Record<string, unknown>;
  lastSelectedAgents?: string[];
}

/**
 * Read and parse .skill-lock.json. Returns null if file doesn't exist.
 * Throws on malformed JSON or other I/O errors.
 */
export async function readLockFile(path: string): Promise<SkillLockFile | null> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as SkillLockFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Get lastSelectedAgents from lock file, filtered to valid agent IDs.
 * Returns empty array if file missing or field absent.
 */
export async function getLastSelectedAgents(path: string): Promise<AgentId[]> {
  const lock = await readLockFile(path);
  if (!lock?.lastSelectedAgents) return [];

  const validIds = new Set(Object.keys(agentRegistry));
  return lock.lastSelectedAgents.filter(
    (id): id is AgentId => validIds.has(id)
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lockfile.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add lock file reader for .skill-lock.json"
```

---

### Task 4: GitHub Authentication

**Files:**
- Create: `src/auth.ts`
- Create: `src/auth.test.ts`

**Step 1: Write the failing test**

```typescript
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
    mockExecSync.mockReturnValue(Buffer.from('ghp_abc123\n'));
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/auth.test.ts`
Expected: FAIL — module `./auth.js` not found

**Step 3: Write implementation**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/auth.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add GitHub authentication with gh CLI fallback"
```

---

### Task 5: Git Operations (push/pull core)

**Files:**
- Create: `src/git-ops.ts`
- Create: `src/git-ops.test.ts`

**Step 1: Write the failing test**

```typescript
// src/git-ops.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildRemoteUrl, hasUncommittedChanges, getRepoRemoteUrl } from './git-ops.js';

describe('buildRemoteUrl', () => {
  it('builds HTTPS URL with token', () => {
    const url = buildRemoteUrl('tc9011/my-skills', 'ghp_abc123');
    expect(url).toBe('https://ghp_abc123@github.com/tc9011/my-skills.git');
  });

  it('builds HTTPS URL without token', () => {
    const url = buildRemoteUrl('tc9011/my-skills', null);
    expect(url).toBe('https://github.com/tc9011/my-skills.git');
  });
});
```

Note: Full push/pull integration tests are deferred to Task 9 (integration tests). This task tests utility functions only.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/git-ops.test.ts`
Expected: FAIL — module `./git-ops.js` not found

**Step 3: Write implementation**

```typescript
// src/git-ops.ts
import simpleGit, { type SimpleGit } from 'simple-git';
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
    const origin = remotes.find(r => r.name === 'origin');
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/git-ops.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add git operations for push/pull skills"
```

---

### Task 6: Symlink Manager

**Files:**
- Create: `src/linker.ts`
- Create: `src/linker.test.ts`

**Step 1: Write the failing test**

```typescript
// src/linker.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readlink, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSkillSymlinks, computeRelativeSymlinkTarget, type LinkResult } from './linker.js';

describe('computeRelativeSymlinkTarget', () => {
  it('computes relative path from opencode global to canonical', () => {
    const result = computeRelativeSymlinkTarget(
      '/Users/test/.config/opencode/skills/my-skill',
      '/Users/test/.agents/skills/my-skill',
    );
    expect(result).toBe('../../../../.agents/skills/my-skill');
  });

  it('computes relative path from claude global to canonical', () => {
    const result = computeRelativeSymlinkTarget(
      '/Users/test/.claude/skills/my-skill',
      '/Users/test/.agents/skills/my-skill',
    );
    expect(result).toBe('../../.agents/skills/my-skill');
  });
});

describe('createSkillSymlinks', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'linker-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates symlinks for skills to agent directory', async () => {
    // Setup: canonical skills
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');

    // Target agent dir
    const agentDir = join(tempDir, '.config', 'opencode', 'skills');
    await mkdir(agentDir, { recursive: true });

    const results = await createSkillSymlinks(
      canonical,
      agentDir,
      ['my-skill'],
    );

    expect(results).toHaveLength(1);
    expect(results[0].skill).toBe('my-skill');
    expect(results[0].status).toBe('created');

    // Verify symlink exists and is relative
    const linkTarget = await readlink(join(agentDir, 'my-skill'));
    expect(linkTarget).toContain('.agents/skills/my-skill');
  });

  it('skips skills that do not exist in canonical', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(canonical, { recursive: true });
    const agentDir = join(tempDir, '.config', 'opencode', 'skills');
    await mkdir(agentDir, { recursive: true });

    const results = await createSkillSymlinks(
      canonical,
      agentDir,
      ['nonexistent-skill'],
    );

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toContain('not found');
  });

  it('reports already-existing symlinks', async () => {
    const canonical = join(tempDir, '.agents', 'skills');
    await mkdir(join(canonical, 'my-skill'), { recursive: true });
    await writeFile(join(canonical, 'my-skill', 'SKILL.md'), '# My Skill');
    const agentDir = join(tempDir, '.config', 'opencode', 'skills');
    await mkdir(agentDir, { recursive: true });

    // Create first
    await createSkillSymlinks(canonical, agentDir, ['my-skill']);
    // Create again
    const results = await createSkillSymlinks(canonical, agentDir, ['my-skill']);

    expect(results[0].status).toBe('exists');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/linker.test.ts`
Expected: FAIL — module `./linker.js` not found

**Step 3: Write implementation**

```typescript
// src/linker.ts
import { symlink, lstat, readdir, mkdir, readlink } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { existsSync } from 'node:fs';

export interface LinkResult {
  skill: string;
  status: 'created' | 'exists' | 'skipped';
  reason?: string;
}

/**
 * Compute relative symlink target from linkPath to targetPath.
 * This matches how vercel-labs/skills creates relative symlinks.
 */
export function computeRelativeSymlinkTarget(linkPath: string, targetPath: string): string {
  return relative(dirname(linkPath), targetPath);
}

/**
 * Create symlinks from agentSkillsDir/<skill> → canonicalDir/<skill>
 * for each skill name in the list.
 *
 * @param canonicalDir - Absolute path to ~/.agents/skills/
 * @param agentSkillsDir - Absolute path to agent's global skills dir
 * @param skillNames - List of skill folder names to link
 */
export async function createSkillSymlinks(
  canonicalDir: string,
  agentSkillsDir: string,
  skillNames: string[],
): Promise<LinkResult[]> {
  // Ensure agent dir exists
  await mkdir(agentSkillsDir, { recursive: true });

  const results: LinkResult[] = [];

  for (const skill of skillNames) {
    const canonicalPath = join(canonicalDir, skill);
    const linkPath = join(agentSkillsDir, skill);

    // Check skill exists in canonical
    if (!existsSync(canonicalPath)) {
      results.push({ skill, status: 'skipped', reason: `not found in ${canonicalDir}` });
      continue;
    }

    // Check if symlink already exists
    try {
      const stats = await lstat(linkPath);
      if (stats.isSymbolicLink()) {
        results.push({ skill, status: 'exists' });
        continue;
      }
      // Exists but not a symlink — skip to avoid overwriting
      results.push({ skill, status: 'skipped', reason: 'path exists but is not a symlink' });
      continue;
    } catch {
      // Doesn't exist — good, we'll create it
    }

    // Create relative symlink
    const target = computeRelativeSymlinkTarget(linkPath, canonicalPath);
    await symlink(target, linkPath);
    results.push({ skill, status: 'created' });
  }

  return results;
}

/**
 * Get all skill folder names from the canonical directory.
 */
export async function listCanonicalSkills(canonicalDir: string): Promise<string[]> {
  try {
    const entries = await readdir(canonicalDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);
  } catch {
    return [];
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/linker.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add symlink manager for agent skill linking"
```

---

### Task 7: CLI Commands (push, pull, link)

**Files:**
- Create: `src/commands/push.ts`
- Create: `src/commands/pull.ts`
- Create: `src/commands/link.ts`
- Modify: `src/index.ts` — wire up Commander.js

**Step 1: Write the failing test for push command**

```typescript
// src/commands/push.test.ts
import { describe, it, expect, vi } from 'vitest';

// We test the command logic, not the CLI parsing
// Push command should: check auth → check repo → stage → commit → push

describe('push command logic', () => {
  it('module exports a pushCommand function', async () => {
    const mod = await import('./push.js');
    expect(typeof mod.pushCommand).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/commands/push.test.ts`
Expected: FAIL — module not found

**Step 3: Implement push command**

```typescript
// src/commands/push.ts
import { CANONICAL_SKILLS_DIR } from '../agents.js';
import { getGitHubToken } from '../auth.js';
import { pushSkills, getRepoRemoteUrl } from '../git-ops.js';
import * as p from '@clack/prompts';

export async function pushCommand(options: { message?: string }): Promise<void> {
  p.intro('skills-manager push');

  // 1. Check auth
  const token = getGitHubToken();
  if (!token) {
    p.cancel('No GitHub authentication found. Run `gh auth login` or set GITHUB_TOKEN.');
    process.exit(1);
  }

  // 2. Check canonical dir has a remote
  const remote = await getRepoRemoteUrl(CANONICAL_SKILLS_DIR);
  if (!remote) {
    p.cancel(`No git remote found in ${CANONICAL_SKILLS_DIR}. Initialize with git first.`);
    process.exit(1);
  }

  // 3. Push
  const spinner = p.spinner();
  spinner.start('Pushing skills to GitHub...');

  try {
    const result = await pushSkills(CANONICAL_SKILLS_DIR, options.message);
    spinner.stop(
      result.committed
        ? 'Skills pushed successfully!'
        : 'No changes to push — already up to date.',
    );
  } catch (err) {
    spinner.stop('Push failed.');
    p.cancel(String(err));
    process.exit(1);
  }

  p.outro('Done!');
}
```

**Step 4: Implement pull command**

```typescript
// src/commands/pull.ts
import { CANONICAL_SKILLS_DIR } from '../agents.js';
import { getGitHubToken } from '../auth.js';
import { pullSkills, buildRemoteUrl, getRepoRemoteUrl } from '../git-ops.js';
import { linkCommand } from './link.js';
import * as p from '@clack/prompts';

export async function pullCommand(options: { repo?: string; skipLink?: boolean }): Promise<void> {
  p.intro('skills-manager pull');

  const token = getGitHubToken();

  // Determine remote URL
  let remoteUrl: string;
  if (options.repo) {
    remoteUrl = buildRemoteUrl(options.repo, token);
  } else {
    const existing = await getRepoRemoteUrl(CANONICAL_SKILLS_DIR);
    if (!existing) {
      p.cancel('No repo specified and no existing remote. Use --repo owner/name.');
      process.exit(1);
    }
    remoteUrl = existing;
  }

  // Pull
  const spinner = p.spinner();
  spinner.start('Pulling skills from GitHub...');

  try {
    const result = await pullSkills(CANONICAL_SKILLS_DIR, remoteUrl);
    spinner.stop(
      result.cloned
        ? 'Skills cloned successfully!'
        : 'Skills updated from remote.',
    );
  } catch (err) {
    spinner.stop('Pull failed.');
    p.cancel(String(err));
    process.exit(1);
  }

  // Auto-run link unless skipped
  if (!options.skipLink) {
    await linkCommand({});
  } else {
    p.outro('Pull complete. Run `skills-manager link` to create agent symlinks.');
  }
}
```

**Step 5: Implement link command**

```typescript
// src/commands/link.ts
import { CANONICAL_SKILLS_DIR, SKILL_LOCK_PATH, agentRegistry, getAgentGlobalPath, type AgentId } from '../agents.js';
import { getLastSelectedAgents } from '../lockfile.js';
import { createSkillSymlinks, listCanonicalSkills } from '../linker.js';
import * as p from '@clack/prompts';
import { existsSync } from 'node:fs';

export async function linkCommand(options: { agents?: string[] }): Promise<void> {
  p.intro('skills-manager link');

  // 1. Read lock file for lastSelectedAgents
  let agents: AgentId[];
  if (options.agents?.length) {
    agents = options.agents as AgentId[];
  } else {
    agents = await getLastSelectedAgents(SKILL_LOCK_PATH);
    if (agents.length === 0) {
      p.cancel('No lastSelectedAgents found in .skill-lock.json. Use --agents to specify.');
      process.exit(1);
    }
  }

  // 2. Interactive confirmation
  const agentChoices = agents.map(id => {
    const globalPath = getAgentGlobalPath(id);
    const dirExists = existsSync(globalPath) || existsSync(require('node:path').dirname(globalPath));
    return {
      value: id,
      label: `${agentRegistry[id].displayName} (${id})`,
      hint: dirExists ? globalPath : `${globalPath} — directory will be created`,
    };
  });

  const selected = await p.multiselect({
    message: 'Select agents to link skills to:',
    options: agentChoices,
    initialValues: agents,
    required: false,
  });

  if (p.isCancel(selected) || !selected.length) {
    p.cancel('No agents selected.');
    return;
  }

  // 3. Get skill list
  const skills = await listCanonicalSkills(CANONICAL_SKILLS_DIR);
  if (skills.length === 0) {
    p.cancel(`No skills found in ${CANONICAL_SKILLS_DIR}.`);
    process.exit(1);
  }

  // 4. Create symlinks for each agent
  const linkedAgents: string[] = [];
  const skippedAgents: { id: string; reason: string }[] = [];

  for (const agentId of selected as AgentId[]) {
    const globalPath = getAgentGlobalPath(agentId);
    const spinner = p.spinner();
    spinner.start(`Linking ${agentRegistry[agentId].displayName}...`);

    try {
      const results = await createSkillSymlinks(CANONICAL_SKILLS_DIR, globalPath, skills);
      const created = results.filter(r => r.status === 'created').length;
      const existed = results.filter(r => r.status === 'exists').length;
      const skipped = results.filter(r => r.status === 'skipped').length;

      spinner.stop(`${agentRegistry[agentId].displayName}: ${created} linked, ${existed} existing, ${skipped} skipped`);
      linkedAgents.push(agentId);
    } catch (err) {
      spinner.stop(`${agentRegistry[agentId].displayName}: failed`);
      skippedAgents.push({ id: agentId, reason: String(err) });
    }
  }

  // 5. Summary
  p.note(
    [
      linkedAgents.length > 0 ? `✓ Linked: ${linkedAgents.join(', ')}` : '',
      skippedAgents.length > 0 ? `✗ Skipped: ${skippedAgents.map(s => `${s.id} (${s.reason})`).join(', ')}` : '',
    ].filter(Boolean).join('\n'),
    'Summary',
  );

  p.outro('Done!');
}
```

**Step 6: Wire up CLI entry point**

```typescript
// src/index.ts
#!/usr/bin/env node
import { Command } from 'commander';
import { pushCommand } from './commands/push.js';
import { pullCommand } from './commands/pull.js';
import { linkCommand } from './commands/link.js';

const program = new Command();

program
  .name('skills-manager')
  .description('Backup and restore AI agent skills to GitHub')
  .version('0.1.0');

program
  .command('push')
  .description('Push skills from ~/.agents/skills/ to GitHub')
  .option('-m, --message <message>', 'Commit message')
  .action(pushCommand);

program
  .command('pull')
  .description('Pull skills from GitHub to ~/.agents/skills/')
  .option('-r, --repo <repo>', 'GitHub repo (owner/name)')
  .option('--skip-link', 'Skip automatic agent linking after pull')
  .action(pullCommand);

program
  .command('link')
  .description('Create symlinks from canonical skills to agent directories')
  .option('-a, --agents <agents...>', 'Agent IDs to link (default: from .skill-lock.json)')
  .action(linkCommand);

program.parse();
```

**Step 7: Verify CLI boots**

Run: `npx tsx src/index.ts --help`
Expected: Shows help with push/pull/link commands

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: add push, pull, link CLI commands with interactive UX"
```

---

### Task 8: Fix link command import (node:path)

The link command uses `require('node:path')` which is CJS. Fix to use ESM import.

**Step 1: Fix the import**

In `src/commands/link.ts`, change:
```typescript
// Replace: existsSync(require('node:path').dirname(globalPath))
// With proper import at top: import { dirname } from 'node:path';
// And use: existsSync(dirname(globalPath))
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: use ESM import for node:path in link command"
```

---

### Task 9: Integration Test

**Files:**
- Create: `src/integration.test.ts`

A lightweight integration test that exercises the link flow end-to-end using a temp directory (no real GitHub calls).

**Step 1: Write integration test**

```typescript
// src/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSkillSymlinks, listCanonicalSkills } from './linker.js';

describe('integration: link flow', () => {
  let tempDir: string;
  let canonical: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sm-integ-'));
    canonical = join(tempDir, '.agents', 'skills');

    // Create fake canonical skills
    for (const skill of ['brainstorming', 'tdd', 'vue']) {
      await mkdir(join(canonical, skill), { recursive: true });
      await writeFile(join(canonical, skill, 'SKILL.md'), `# ${skill}`);
    }
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('lists skills from canonical directory', async () => {
    const skills = await listCanonicalSkills(canonical);
    expect(skills).toHaveLength(3);
    expect(skills).toContain('brainstorming');
  });

  it('creates symlinks for multiple agent directories', async () => {
    const skills = await listCanonicalSkills(canonical);
    const agents = [
      join(tempDir, '.config', 'opencode', 'skills'),
      join(tempDir, '.claude', 'skills'),
    ];

    for (const agentDir of agents) {
      const results = await createSkillSymlinks(canonical, agentDir, skills);
      expect(results.every(r => r.status === 'created')).toBe(true);
    }

    // Verify symlinks are relative
    const link = await readlink(join(agents[0], 'brainstorming'));
    expect(link).not.toMatch(/^\//); // Should be relative, not absolute
    expect(link).toContain('.agents/skills/brainstorming');
  });

  it('is idempotent — running link twice produces exists status', async () => {
    const skills = await listCanonicalSkills(canonical);
    const agentDir = join(tempDir, '.config', 'opencode', 'skills');

    const first = await createSkillSymlinks(canonical, agentDir, skills);
    expect(first.every(r => r.status === 'created')).toBe(true);

    const second = await createSkillSymlinks(canonical, agentDir, skills);
    expect(second.every(r => r.status === 'exists')).toBe(true);
  });
});
```

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "test: add integration tests for link flow"
```

---

### Task 10: Final Verification & Cleanup

**Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All PASS

**Step 3: Manual smoke test**

Run: `npx tsx src/index.ts --help`
Expected: Shows help

Run: `npx tsx src/index.ts push --help`
Expected: Shows push command help

Run: `npx tsx src/index.ts link --help`
Expected: Shows link command help

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass"
```

---

## Summary

| Task | Description | Tests |
|------|-------------|-------|
| 1 | Project scaffold | vitest boots |
| 2 | Agent registry (41 agents) | 6 tests |
| 3 | Lock file reader | 6 tests |
| 4 | GitHub authentication | 4 tests |
| 5 | Git operations (push/pull) | 2 tests |
| 6 | Symlink manager | 5 tests |
| 7 | CLI commands (push/pull/link) | CLI boots |
| 8 | ESM import fix | tsc passes |
| 9 | Integration test | 3 tests |
| 10 | Final verification | All green |

**Total: 10 tasks, ~26 tests, TDD throughout.**
