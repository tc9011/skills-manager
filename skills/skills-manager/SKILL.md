---
name: skills-manager
description: Manage AI agent skills backup and sync via the skills-manager CLI. Use when the user asks to push skills to GitHub, pull skills from GitHub, link or symlink skills to agents, sync skills across machines, set up project-level skills, or manage the ~/.agents/ directory. Also triggers on "sm push", "sm pull", "sm link", "backup my skills", "restore skills on new machine", "link --project", "project skills setup", "sync agents skills", or any question about the skills-manager or sm CLI.
---

# skills-manager CLI

CLI companion to [vercel-labs/skills](https://github.com/vercel-labs/skills) — backup, restore, and symlink AI agent skills via GitHub.

## Invocation

Two equivalent ways to run the CLI:

```bash
# Global install (recommended)
npm install -g @tc9011/skills-manager
sm push          # short alias
skills-manager push  # full name

# Without installing — use the bundled wrapper script
export SM="$HOME/.agents/skills/skills-manager/scripts/sm.sh"
"$SM" push
```

Requires Node.js ≥ 20. [GitHub CLI](https://cli.github.com/) (`gh`) recommended for auth.

## Key Paths

| Path | Purpose |
|------|---------|
| `~/.agents/` | Git repo root (push/pull target) |
| `~/.agents/skills/` | Canonical skills directory |
| `~/.agents/.skill-lock.json` | Lock file (**READ ONLY** — owned by vercel-labs/skills) |

## Authentication

Auth is **optional** — if git already has credentials (SSH keys, macOS Keychain, etc.), push/pull work without setup.

When git cannot authenticate, the CLI tries these sources in order:

1. `gh auth token` — GitHub CLI
2. `$GITHUB_TOKEN` — environment variable
3. `$GH_TOKEN` — environment variable

If push fails with an auth error:
- **Has `gh`** → `gh auth login`
- **No `gh`** → `export GITHUB_TOKEN=ghp_your_token_here`

`link` never requires authentication.

## Commands

### push

Commit and push `~/.agents/` to GitHub.

```bash
sm push                    # auto-generated commit message
sm push -m "add new skill" # custom message
```

First run auto-initializes git repo and prompts for a remote URL. On conflict (remote ahead of local), rejects with instructions to pull first.

### pull

Pull from GitHub. Auto-runs `link` afterward unless skipped.

```bash
sm pull --repo owner/name  # first time — specify repo
sm pull                    # subsequent runs — uses existing remote
sm pull --skip-link        # pull only, skip auto-link
```

On rebase conflict, aborts and shows manual resolution steps.

### link (global mode)

Read `.skill-lock.json`, create **relative** symlinks from each agent's global skills directory to `~/.agents/skills/`.

```bash
sm link                              # interactive prompt
sm link --agents cursor opencode     # non-interactive, skip prompt
```

**Interactive prompt behavior:**

The agent selection uses a **searchable multiselect** with two sections:

1. **Locked section** — Universal agents (amp, cline, codex, cursor, gemini-cli, github-copilot, kimi-cli, opencode, replit, universal) are always included. They share `~/.agents/skills/` as their project path, so linking them is a no-op beyond the global symlink — they're locked to avoid confusion.

2. **Searchable list** — All 31 non-universal agents appear here. Type to filter by name. Pre-selection comes from (in priority order): last saved selection → `.skill-lock.json` → agents whose directory already exists on disk.

When `--agents` is provided, the prompt is skipped entirely. Selection is persisted to `~/.config/skills-manager/config.json` for the next run.

### link --project

Link or copy skills to the **current working directory**. Three-step interactive flow:

1. **Select skills** (`--skills`) — which skills to include (none pre-selected)
2. **Copy or symlink** (`--mode`) — `copy` (default, recommended) or absolute `symlink`
3. **Select agents** (`--agents`) — same searchable multiselect with locked universal section as global mode

```bash
cd /path/to/project
sm link --project                                               # interactive
sm link --project --agents cursor claude-code --skills my-skill --mode copy  # non-interactive
```

Agents sharing the same `projectPath` are deduplicated — one copy/link operation per unique path.

## Common Workflows

### First-time setup on a new machine

```bash
sm pull --repo owner/my-skills   # clone + auto-link
```

### Daily sync

```bash
sm pull    # fetch latest + re-link
sm push    # backup local changes
```

### Project-level skills

```bash
cd /path/to/project
sm link --project
# Creates e.g. .agents/skills/, .claude/skills/ in CWD
```

## Supported Agents (41)

- **10 universal** (always locked in interactive prompts): amp, cline, codex, cursor, gemini-cli, github-copilot, kimi-cli, opencode, replit, universal
- **31 non-universal** (appear in searchable list): claude-code, windsurf, trae, roo, augment, continue, goose, and more

## Constraints

- `.skill-lock.json` is READ ONLY — never create, modify, or delete it
- `~/.agents/` is the git repo root (not `~/.agents/skills/`)
- Global link = relative symlinks; project link = absolute symlinks or copies
- Auth tokens are transient in-memory only — never persisted to `.git/config`
