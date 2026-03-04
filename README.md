<div align="center">

# skills-manager

**Backup and restore your AI agent skills to GitHub.**

A CLI companion to [vercel-labs/skills](https://github.com/vercel-labs/skills) — push your `~/.agents/` directory to a remote repo, pull it on any machine, and automatically symlink skills to all your agents.

[![npm version](https://img.shields.io/npm/v/%40tc9011%2Fskills-manager?color=cb0000&label=npm)](https://www.npmjs.com/package/@tc9011/skills-manager)
[![CI](https://img.shields.io/github/actions/workflow/status/tc9011/skills-manager/ci.yml?label=CI)](https://github.com/tc9011/skills-manager/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

</div>

---

## Why

[vercel-labs/skills](https://github.com/vercel-labs/skills) installs and manages skills, but doesn't handle backup, restore, or cross-machine sync. `skills-manager` fills that gap:

- **Push** — commit and push `~/.agents/` (skills + lock file) to GitHub
- **Pull** — clone or pull your skills on any machine
- **Link** — read `.skill-lock.json` and create symlinks to every agent you use
- **Project Link** — link or copy skills directly to your current project directory for localized development

> **Note:** This tool reads `.skill-lock.json` but never modifies it — that file is owned by `vercel-labs/skills`.

## Installation

```bash
# Run directly (no install)
npx @tc9011/skills-manager push

# Or install globally
npm install -g @tc9011/skills-manager
```

> **Tip:** If installed globally, you can use `skills-manager` instead of `npx @tc9011/skills-manager` in all commands below.

**Requirements:** Node.js ≥ 20, [GitHub CLI](https://cli.github.com/) (`gh`) recommended for auth.

## Quick Start

```bash
# 1. Backup skills to GitHub
skills-manager push

# 2. Restore on a new machine
skills-manager pull --repo owner/my-skills

# 3. Re-link skills to agents (auto-runs after pull)
skills-manager link

# 4. Link skills to current project directory
skills-manager link --project
```

On first run, `push` and `pull` will interactively set up a git repo and remote if `~/.agents/` isn't already one.

## Commands

### `skills-manager push`

Commits and pushes `~/.agents/` to its configured GitHub remote.

```bash
skills-manager push
skills-manager push -m "add new debugging skill"
```

| Option | Description |
|--------|-------------|
| `-m, --message <msg>` | Custom commit message (default: auto-generated) |

### `skills-manager pull`

Pulls from GitHub and automatically runs `link`.

```bash
skills-manager pull --repo tc9011/my-skills
skills-manager pull                          # uses existing remote
skills-manager pull --skip-link              # pull only, don't link
```

| Option | Description |
|--------|-------------|
| `-r, --repo <owner/name>` | GitHub repo to pull from |
| `--skip-link` | Skip automatic agent linking after pull |

### `skills-manager link`

Reads `.skill-lock.json` and creates relative symlinks from each agent's skills directory to the canonical `~/.agents/skills/`.

```bash
skills-manager link
skills-manager link --agents cursor opencode claude-code
```

| Option | Description |
|--------|-------------|
| `-a, --agents <ids...>` | Agent IDs to link (skips agent prompt when provided) |
| `-p, --project` | Link skills to project directory (CWD) instead of global paths |
| `-s, --skills <skills...>` | Skill names to link (project mode only, skips skill prompt) |
| `--mode <mode>` | `copy` or `symlink` (project mode only, default: `copy`, skips prompt) |
An interactive multiselect prompt lets you pick which agents to link. Only agents with local directories are pre-selected. Your selection is remembered for next time.

When `--agents` is provided, the agent selection prompt is skipped entirely — useful for scripting and AI agent automation:

```bash
# Non-interactive: link all skills to specific agents
skills-manager link --agents cursor opencode
```

**Symlink model:**

```
~/.config/opencode/skills/my-skill → ../../../.agents/skills/my-skill   (relative)
~/.claude/skills/my-skill          → ../../.agents/skills/my-skill      (relative)
```

**Project Mode:**

When using `--project` (or `-p`), you'll go through three interactive prompts:

1. **Select skills** — choose which skills to link (none pre-selected)
2. **Copy or symlink** — copy files (default, recommended) or create absolute symlinks
3. **Select agents** — choose which agents to set up project-level skills for

All three prompts can be skipped by providing `--skills`, `--mode`, and `--agents` on the command line:

```bash
# Fully non-interactive project link
skills-manager link --project --agents cursor claude-code --skills my-skill --mode copy
```
Example project structure after `link --project`:
```
./project/
├── .agents/skills/my-skill       ← shared by universal agents (copied or symlinked)
├── .claude/skills/my-skill       ← claude-code specific
├── .cursor/skills/my-skill       → ~/.agents/skills/my-skill (absolute symlink)
└── .trae/skills/my-skill         ← trae specific
```

- **Skill Selection:** Only the skills you pick are copied/linked — you don't have to include everything.
- **Deduplication:** Agents sharing the same project path only trigger one copy/link operation.
- **Copy vs Symlink:** Copying creates independent files (recommended for portability). Symlinking points back to `~/.agents/skills/` using absolute paths.

## Authentication

Authentication is **optional**. If git already has credentials configured (SSH keys, macOS Keychain, `git credential-manager`, etc.), push and pull will work without any extra setup.

When no git credentials are available, the CLI looks for a token in this order:

1. **`gh auth token`** — GitHub CLI (recommended)
2. **`$GITHUB_TOKEN`** — environment variable
3. **`$GH_TOKEN`** — environment variable

If none are found, git will attempt the operation unauthenticated — which works for public repos but will fail for private ones. The `link` command never requires authentication.

## Supported Agents

41 agents — matching the full [vercel-labs/skills](https://github.com/vercel-labs/skills) registry.

<details>
<summary><strong>Universal Agents</strong> (share <code>~/.agents/skills</code>)</summary>

| Agent | ID | Global Path |
|-------|----|-------------|
| Amp | `amp` | `$XDG_CONFIG_HOME/agents/skills` |
| Cline | `cline` | `~/.agents/skills` |
| Codex | `codex` | `$CODEX_HOME/skills` |
| Cursor | `cursor` | `~/.cursor/skills` |
| Gemini CLI | `gemini-cli` | `~/.gemini/skills` |
| GitHub Copilot | `github-copilot` | `~/.copilot/skills` |
| Kimi Code CLI | `kimi-cli` | `$XDG_CONFIG_HOME/agents/skills` |
| OpenCode | `opencode` | `$XDG_CONFIG_HOME/opencode/skills` |
| Replit | `replit` | `$XDG_CONFIG_HOME/agents/skills` |
| Universal | `universal` | `$XDG_CONFIG_HOME/agents/skills` |

</details>

<details>
<summary><strong>Non-Universal Agents</strong> (agent-specific paths)</summary>

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
| Crush | `crush` | `$XDG_CONFIG_HOME/crush/skills` |
| Droid | `droid` | `~/.factory/skills` |
| Goose | `goose` | `$XDG_CONFIG_HOME/goose/skills` |
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
| Roo Code | `roo` | `~/.roo/skills` |
| Trae | `trae` | `~/.trae/skills` |
| Trae CN | `trae-cn` | `~/.trae-cn/skills` |
| Windsurf | `windsurf` | `~/.codeium/windsurf/skills` |
| Zencoder | `zencoder` | `~/.zencoder/skills` |

</details>

## Environment Variables

| Variable | Used By | Default |
|----------|---------|---------|
| `GITHUB_TOKEN` | `push`, `pull` | — |
| `GH_TOKEN` | `push`, `pull` | — |
| `XDG_CONFIG_HOME` | `opencode`, `amp`, `kimi-cli`, `replit`, `universal`, `goose`, `crush` | `~/.config` |
| `CODEX_HOME` | `codex` | `~/.codex` |
| `CLAUDE_CONFIG_DIR` | `claude-code` | `~/.claude` |

## How It Works

```
~/.agents/                  ← Git repo (push/pull target)
├── .skill-lock.json        ← Owned by vercel-labs/skills (read-only)
└── skills/
    ├── my-skill/
    └── another-skill/

skills-manager link reads .skill-lock.json → creates relative symlinks:

~/.cursor/skills/my-skill        → ../../.agents/skills/my-skill
~/.claude/skills/my-skill        → ../../.agents/skills/my-skill
~/.config/opencode/skills/my-skill → ../../../.agents/skills/my-skill
```

```
skills-manager link --project reads .skill-lock.json → select skills → choose copy/symlink → select agents → copies/symlinks to CWD:

./my-project/.agents/skills/my-skill    ← copied from ~/.agents/skills/
./my-project/.claude/skills/my-skill    ← copied from ~/.agents/skills/
```
## Skill

This project includes a skill at `skills/skills-manager/` that teaches AI agents how to operate the CLI — push, pull, and link commands.

```bash
# Install via vercel-labs/skills CLI
npx skills add tc9011/skills-manager

# Install a specific skill to specific agents
npx skills add tc9011/skills-manager --skill skills-manager -a opencode -a claude-code

# Install globally (available across all projects)
npx skills add tc9011/skills-manager -g
```

## Contributing

### Setup

```bash
git clone https://github.com/tc9011/skills-manager.git
cd skills-manager
npm install
```

### Development

```bash
# Run commands directly (no build step)
npx tsx src/index.ts push
npx tsx src/index.ts link

# Or via npm script
npm run dev -- push
```

### Testing

```bash
npm test                  # run tests
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

### Build

```bash
npm run build             # compile TypeScript → dist/
npm run lint              # run ESLint
```

### Project Structure

```
src/
├── index.ts              # CLI entry point (Commander.js)
├── agents.ts             # 41-agent registry + path resolution
├── auth.ts               # GitHub token resolution
├── config.ts             # XDG-compliant config persistence
├── lockfile.ts           # Read-only .skill-lock.json parser
├── linker.ts             # Symlink creation + project-level copy/link
├── git-ops.ts            # Git push/pull via simple-git
└── commands/
    ├── push.ts           # Push handler
    ├── pull.ts           # Pull handler (auto-runs link)
    └── link.ts           # Link handler (interactive multiselect)
```

### Releasing

Releases are fully automated with [semantic-release](https://github.com/semantic-release/semantic-release). Just use [Conventional Commits](https://www.conventionalcommits.org/) and push to `main`:

| Commit prefix | Version bump | Example |
|---|---|---|
| `fix:` | Patch (`0.1.0` → `0.1.1`) | `fix: handle missing config` |
| `feat:` | Minor (`0.1.0` → `0.2.0`) | `feat: add export command` |
| `feat!:` or `BREAKING CHANGE:` | Major (`0.1.0` → `1.0.0`) | `feat!: drop Node 18 support` |

The CI pipeline will automatically:
1. Analyze commits since last release
2. Determine version bump
3. Update `package.json` + `CHANGELOG.md`
4. Publish to npm
5. Create a GitHub Release with notes

## License

[MIT](./LICENSE)
