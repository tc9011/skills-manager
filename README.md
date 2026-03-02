# skills-manager

A CLI companion to [vercel-labs/skills](https://github.com/vercel-labs/skills) that backs up your AI agent skills to GitHub and restores them with automatic agent symlink creation.

## Why

`vercel-labs/skills` installs and manages skills, but it doesn't handle:

- **Backup** — pushing your `~/.agents/skills/` to a remote GitHub repo
- **Restore** — cloning skills back on a new machine
- **Agent linking** — reading `.skill-lock.json` and creating symlinks to every agent you use

`skills-manager` fills that gap. It reads the lock file that `vercel-labs/skills` owns (never modifies it) and creates relative symlinks from each agent's skills directory back to the canonical `~/.agents/skills/` source.

## Quick Start

```bash
# 1. Backup skills to GitHub
skills-manager push

# 2. Restore skills on a new machine
skills-manager pull --repo owner/my-skills

# 3. Link skills to your agents (auto-runs after pull)
skills-manager link
```

## Commands

### `push`

Commits and pushes the contents of `~/.agents/skills/` to its configured GitHub remote.

```bash
skills-manager push
skills-manager push -m "add new debugging skill"
```

| Option | Description |
|--------|-------------|
| `-m, --message <msg>` | Custom commit message (default: auto-generated) |

**Prerequisites**: The `~/.agents/skills/` directory must be a git repository with a remote configured.

### `pull`

Clones or pulls skills from GitHub into `~/.agents/skills/`, then automatically runs `link`.

```bash
skills-manager pull --repo tc9011/my-skills
skills-manager pull                          # uses existing remote
skills-manager pull --skip-link              # pull only, don't link
```

| Option | Description |
|--------|-------------|
| `-r, --repo <owner/name>` | GitHub repo to pull from (default: existing remote) |
| `--skip-link` | Skip automatic agent linking after pull |

### `link`

Reads `~/.agents/.skill-lock.json` (owned by `vercel-labs/skills`) and creates relative symlinks from each agent's global skills directory to the canonical `~/.agents/skills/`.

```bash
skills-manager link
skills-manager link --agents cursor opencode claude-code
```

| Option | Description |
|--------|-------------|
| `-a, --agents <ids...>` | Agent IDs to link (default: `lastSelectedAgents` from lock file) |

**Interactive**: Presents a multiselect prompt with all `lastSelectedAgents` pre-selected. You can deselect agents you don't want to link.

**Symlink model**:

```
~/.config/opencode/skills/my-skill → ../../../.agents/skills/my-skill   (relative)
~/.claude/skills/my-skill          → ../../.agents/skills/my-skill      (relative)
```

## Authentication

Token resolution order:

1. `gh auth token` — GitHub CLI (preferred)
2. `$GITHUB_TOKEN` environment variable
3. `$GH_TOKEN` environment variable

If none found, `push` and `pull` will fail with a clear error message. `link` does not require authentication.

## Supported Agents

### Universal Agents (share `.agents/skills`)

| Agent | ID | Global Path |
|-------|----|-------------|
| Amp | `amp` | `~/.config/agents/skills` |
| Cline | `cline` | `~/.agents/skills` |
| Codex | `codex` | `$CODEX_HOME/skills` |
| Cursor | `cursor` | `~/.cursor/skills` |
| Gemini CLI | `gemini-cli` | `~/.gemini/skills` |
| GitHub Copilot | `github-copilot` | `~/.copilot/skills` |
| Kimi Code CLI | `kimi-cli` | `~/.config/agents/skills` |
| OpenCode | `opencode` | `$XDG_CONFIG_HOME/opencode/skills` |
| Replit | `replit` | `~/.config/agents/skills` |
| Universal | `universal` | `~/.config/agents/skills` |

### Non-Universal Agents (agent-specific paths)

| Agent | ID | Global Path |
|-------|----|-------------|
| AdaL | `adal` | `~/.adal/skills` |
| Antigravity | `antigravity` | `~/.gemini/antigravity/skills` |
| Augment | `augment` | `~/.augment/skills` |
| Claude Code | `claude-code` | `$CLAUDE_CONFIG_DIR/skills` |
| CodeBuddy | `codebuddy` | `~/.codebuddy/skills` |
| Command Code | `command-code` | `~/.commandcode/skills` |
| Continue | `continue` | `~/.continue/skills` |
| Cortex Code | `cortex` | `~/.snowflake/cortex/skills` |
| Crush | `crush` | `~/.config/crush/skills` |
| Droid | `droid` | `~/.factory/skills` |
| Goose | `goose` | `~/.config/goose/skills` |
| iFlow CLI | `iflow-cli` | `~/.iflow/skills` |
| Junie | `junie` | `~/.junie/skills` |
| Kilo Code | `kilo` | `~/.kilocode/skills` |
| Kiro CLI | `kiro-cli` | `~/.kiro/skills` |
| Kode | `kode` | `~/.kode/skills` |
| MCPJam | `mcpjam` | `~/.mcpjam/skills` |
| Mistral Vibe | `mistral-vibe` | `~/.vibe/skills` |
| Mux | `mux` | `~/.mux/skills` |
| Neovate | `neovate` | `~/.neovate/skills` |
| OpenClaw | `openclaw` | `~/.openclaw/skills` |
| OpenHands | `openhands` | `~/.openhands/skills` |
| Pi | `pi` | `~/.pi/agent/skills` |
| Pochi | `pochi` | `~/.pochi/skills` |
| Qoder | `qoder` | `~/.qoder/skills` |
| Qwen Code | `qwen-code` | `~/.qwen/skills` |
| Replit | `replit` | `~/.config/agents/skills` |
| Roo Code | `roo` | `~/.roo/skills` |
| Trae | `trae` | `~/.trae/skills` |
| Trae CN | `trae-cn` | `~/.trae-cn/skills` |
| Windsurf | `windsurf` | `~/.codeium/windsurf/skills` |
| Zencoder | `zencoder` | `~/.zencoder/skills` |

**41 agents total** — matching the full [vercel-labs/skills](https://github.com/vercel-labs/skills) agent registry.

## Environment Variables

| Variable | Used By | Default |
|----------|---------|---------|
| `$GITHUB_TOKEN` | `push`, `pull` | — |
| `$GH_TOKEN` | `push`, `pull` | — |
| `$XDG_CONFIG_HOME` | `opencode`, `amp`, `kimi-cli`, `replit`, `universal` | `~/.config` |
| `$CODEX_HOME` | `codex` | `~/.codex` |
| `$CLAUDE_CONFIG_DIR` | `claude-code` | `~/.claude` |

## Development

### Prerequisites

- Node.js ≥ 20
- GitHub CLI (`gh`) for authentication (recommended)

### Scripts

```bash
npm install           # install dependencies
npm run dev           # run via tsx (development)
npm test              # run tests (vitest)
npm run test:watch    # watch mode
npm run build         # compile TypeScript to dist/
```

### Tech Stack

- **Runtime**: Node.js + TypeScript (ESM)
- **CLI framework**: [Commander.js](https://github.com/tj/commander.js)
- **Git operations**: [simple-git](https://github.com/steveukx/git-js)
- **Interactive prompts**: [@clack/prompts](https://github.com/bombshell-dev/clack)
- **Testing**: [Vitest](https://vitest.dev/)
- **Dev runner**: [tsx](https://github.com/privatenumber/tsx)

### Project Structure

```
src/
├── index.ts              # CLI entry point
├── agents.ts             # 41-agent registry with path resolution
├── auth.ts               # GitHub token resolution (gh CLI → env vars)
├── lockfile.ts           # Read-only .skill-lock.json parser
├── linker.ts             # Relative symlink creation
├── git-ops.ts            # Git push/pull via simple-git
└── commands/
    ├── push.ts           # push command handler
    ├── pull.ts           # pull command handler (auto-links)
    └── link.ts           # link command handler (interactive)
```

### Adding a New Agent

1. Add the agent ID to the `AgentId` union type in `src/agents.ts`
2. Add the agent entry to `agentRegistry` with `displayName`, `projectPath`, `globalPath`, and `universal` flag
3. If the agent uses an environment variable for path resolution, add it to `getAgentGlobalPath()`
4. Add a test case in `src/agents.test.ts`

## License

MIT
