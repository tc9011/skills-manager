# AGENTS.md

Coding guidelines for AI agents working on this project.

## Project Overview

`skills-manager` is a CLI tool that backs up and restores AI agent skills to GitHub. It is a companion to [vercel-labs/skills](https://github.com/vercel-labs/skills) — it reads the lock file that `vercel-labs/skills` owns but never modifies it.

## Architecture

```
src/
├── index.ts              # CLI entry point (Commander.js)
├── errors.ts             # CliError class for structured error handling
├── agents.ts             # Agent registry (41 agents) + path resolution
├── auth.ts               # GitHub token resolution (gh CLI → env vars → interactive)
├── config.ts             # XDG-compliant config persistence (~/.config/skills-manager/)
├── lockfile.ts           # .skill-lock.json reader (READ ONLY)
├── linker.ts             # Symlink creation (relative) + project copy/link (absolute)
├── git-ops.ts            # Git push/pull via simple-git + repo init/remote setup
└── commands/
    ├── push.ts           # Push handler (auto git-init + remote prompt)
    ├── pull.ts           # Pull handler (auto-runs link)
    └── link.ts           # Link handler (interactive multiselect, remembers selection, --project mode)
```

### Key Constants (`src/agents.ts`)

```typescript
export const AGENTS_DIR = join(homedir(), '.agents');           // git repo root
export const CANONICAL_SKILLS_DIR = join(homedir(), '.agents', 'skills');  // symlink target
export const SKILL_LOCK_PATH = join(homedir(), '.agents', '.skill-lock.json');
```

### Data Flow

```
push:  ~/.agents/ → git add → git commit → git push origin <branch>
pull:  git pull --rebase → auto-run link
link:  read .skill-lock.json → detect local agents → multiselect → create relative symlinks
link --project: read .skill-lock.json → select skills → choose copy/symlink → select agents → group by projectPath → copy/link to CWD
```

## Critical Constraints

### `.skill-lock.json` is READ ONLY

The lock file at `~/.agents/.skill-lock.json` is owned by `vercel-labs/skills`. This project must NEVER create, modify, or delete it. Only read `lastSelectedAgents` from it.

### Git repo root is `~/.agents/`

The entire `~/.agents/` directory is the git repository — not `~/.agents/skills/`. This ensures both `.skill-lock.json` and the `skills/` directory are versioned together.

### Symlink path conventions

Global mode (`link`) uses relative symlinks via `computeRelativeSymlinkTarget()` from `linker.ts`, matching the convention set by `vercel-labs/skills`. Project mode (`link --project`) uses absolute symlinks via `createProjectSymlinks()` (or direct copy via `copySkills()`) because CWD and `~/.agents/skills/` are in unrelated directory trees.

### Agent registry must match vercel-labs/skills

The 41-agent registry in `agents.ts` must stay synchronized with the upstream agent list. When adding agents, follow the existing pattern of universal vs non-universal classification.

## Tech Stack

- **Language**: TypeScript (strict mode, ESM)
- **Target**: ES2022, Node16 module resolution
- **Runtime**: Node.js ≥ 20
- **CLI**: Commander.js
- **Git**: simple-git (named import: `import { simpleGit } from 'simple-git'`)
- **Prompts**: @clack/prompts
- **Testing**: Vitest + @vitest/coverage-v8
- **Linting**: ESLint (flat config, typescript-eslint)
- **Hooks**: Husky (pre-commit: lint-staged, pre-push: test:coverage)

## Code Conventions

### Module System

This project uses ESM (`"type": "module"` in package.json). All imports must use `.js` extensions:

```typescript
import { foo } from './bar.js';      // correct
import { foo } from './bar';         // wrong — will fail at runtime
```

### Import Style

```typescript
// Named imports for simple-git (default import causes TS errors with Node16 resolution)
import { simpleGit } from 'simple-git';

// Namespace import for @clack/prompts
import * as p from '@clack/prompts';
```

### Type Safety

- Strict mode enabled — no `as any`, `@ts-ignore`, or `@ts-expect-error`
- Use the `AgentId` union type for agent identifiers
- Use `p.multiselect<string>({...})` to fix union type distribution issues with @clack/prompts

### Error Handling

Commands follow this pattern:
1. Validate prerequisites (auth, paths, lock file)
2. Show spinner during async operations
3. Catch errors → `p.cancel()` → `process.exit(1)`

Use `CliError` from `errors.ts` for user-facing errors with structured exit codes.

### Testing

- TDD: write failing test first, implement, verify pass
- Tests use Vitest with globals enabled
- Mock filesystem operations — don't touch real `~/.agents/`
- Test files are colocated: `foo.ts` → `foo.test.ts`
- Use `vi.resetAllMocks()` (not `vi.clearAllMocks()`) to reset `mockReturnValue` implementations
- When mocking `node:child_process`, place it in `vi.hoisted()` block
- Run tests: `npm test`
- Run coverage: `npm run test:coverage`

### Git Conventions

Commit messages follow Conventional Commits:
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — tooling, dependencies
- `docs:` — documentation only
- `test:` — test additions or fixes

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `GITHUB_TOKEN` | Auth fallback | — |
| `GH_TOKEN` | Auth fallback | — |
| `XDG_CONFIG_HOME` | Path resolution for opencode, amp, kimi-cli, replit, universal, goose, crush | `~/.config` |
| `CODEX_HOME` | Path resolution for codex | `~/.codex` |
| `CLAUDE_CONFIG_DIR` | Path resolution for claude-code | `~/.claude` |

## CI/CD

- **CI** (`ci.yml`): Runs on push/PR to main/master → lint → test:coverage → build (Node 22)
- **Release** (`publish.yml`): Runs on push to main/master → lint → test → build → `semantic-release` (auto version bump + npm publish via OIDC + GitHub Release + CHANGELOG.md)
- **Package**: `@tc9011/skills-manager` on npm, published with provenance via Trusted Publishers

## Common Tasks

### Adding a new agent

1. Add ID to `AgentId` union in `agents.ts`
2. Add entry to `agentRegistry` with correct `globalPath`, `projectPath`, and `universal` flag
3. If it uses an env var, add resolution logic in `getAgentGlobalPath()`
4. Add test in `agents.test.ts`

### Adding a new command

1. Create `src/commands/<name>.ts` with an async handler function
2. Wire it up in `src/index.ts` via `program.command()`
3. Add tests in `src/commands/<name>.test.ts`

### Running locally

```bash
npx tsx src/index.ts push              # run directly with tsx
npm run dev -- push                    # same via npm script
npm link && skills-manager push        # simulate global install
```

### Publishing a new version

Publishing is fully automated via [semantic-release](https://github.com/semantic-release/semantic-release):

1. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.)
2. Push to `main` (or merge a PR)
3. GitHub Actions runs `semantic-release` which:
   - Analyzes commit messages since last release
   - Determines version bump (patch/minor/major)
   - Updates `package.json` version + `CHANGELOG.md`
   - Publishes to npm via OIDC Trusted Publishers
   - Creates a GitHub Release with auto-generated notes
   - Commits version bump back to the repo
