# AGENTS.md

Coding guidelines for AI agents working on this project.

## Project Overview

`skills-manager` is a CLI tool that backs up and restores AI agent skills to GitHub. It is a companion to [vercel-labs/skills](https://github.com/vercel-labs/skills) — it reads the lock file that `vercel-labs/skills` owns but never modifies it.

## Architecture

```
src/
├── index.ts              # CLI entry point (Commander.js)
├── agents.ts             # Agent registry (41 agents) + path resolution
├── auth.ts               # GitHub token resolution
├── lockfile.ts           # .skill-lock.json reader (READ ONLY)
├── linker.ts             # Symlink creation (relative paths)
├── git-ops.ts            # Git push/pull via simple-git
└── commands/
    ├── push.ts           # Push handler
    ├── pull.ts           # Pull handler (auto-runs link)
    └── link.ts           # Link handler (interactive multiselect)
```

## Critical Constraints

### `.skill-lock.json` is READ ONLY

The lock file at `~/.agents/.skill-lock.json` is owned by `vercel-labs/skills`. This project must NEVER create, modify, or delete it. Only read `lastSelectedAgents` from it.

### Symlinks must be relative

All symlinks from agent directories to `~/.agents/skills/` must use relative paths, matching the convention set by `vercel-labs/skills`. Use `computeRelativeSymlinkTarget()` from `linker.ts`.

### Agent registry must match vercel-labs/skills

The 41-agent registry in `agents.ts` must stay synchronized with the upstream agent list. When adding agents, follow the existing pattern of universal vs non-universal classification.

## Tech Stack

- **Language**: TypeScript (strict mode, ESM)
- **Target**: ES2022, Node16 module resolution
- **Runtime**: Node.js ≥ 20
- **CLI**: Commander.js
- **Git**: simple-git (named import: `import { simpleGit } from 'simple-git'`)
- **Prompts**: @clack/prompts
- **Testing**: Vitest

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

### Testing

- TDD: write failing test first, implement, verify pass
- Tests use Vitest with globals enabled
- Mock filesystem operations — don't touch real `~/.agents/`
- Test files are colocated: `foo.ts` → `foo.test.ts`
- Run tests: `npm test`

### Git Conventions

Commit messages follow Conventional Commits:
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — tooling, dependencies
- `docs:` — documentation only

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `GITHUB_TOKEN` | Auth fallback | — |
| `GH_TOKEN` | Auth fallback | — |
| `XDG_CONFIG_HOME` | Path resolution for opencode, amp, etc. | `~/.config` |
| `CODEX_HOME` | Path resolution for codex | `~/.codex` |
| `CLAUDE_CONFIG_DIR` | Path resolution for claude-code | `~/.claude` |

## Common Tasks

### Adding a new agent

1. Add ID to `AgentId` union in `agents.ts`
2. Add entry to `agentRegistry` with correct paths and `universal` flag
3. If it uses an env var, add resolution logic in `getAgentGlobalPath()`
4. Add test in `agents.test.ts`

### Adding a new command

1. Create `src/commands/<name>.ts` with an async handler function
2. Wire it up in `src/index.ts` via `program.command()`
3. Add tests in `src/commands/<name>.test.ts`
