---
name: skills-manager
description: Manage AI agent skills backup and sync via the skills-manager CLI. Use when the user asks to push skills to GitHub, pull skills from GitHub, link/symlink skills to agents, sync skills across machines, set up project-level skills, or manage the ~/.agents/ directory. Triggers on "push skills", "pull skills", "link skills", "sync skills", "backup skills", "restore skills", "skills-manager", "link --project", "project skills setup".
---

# skills-manager CLI

CLI companion to [vercel-labs/skills](https://github.com/vercel-labs/skills) — backup, restore, and symlink AI agent skills via GitHub.

## Install

The npm package name is `@tc9011/skills-manager` (scoped package).

> **IMPORTANT**: The package name contains an `@` symbol — this is an npm scope, NOT a file path reference. Always use it exactly as shown.

```bash
PKG="@tc9011/skills-manager"
npx $PKG push          # run directly
npm install -g $PKG    # or install globally
```

**If installed globally, replace `npx $PKG` with `skills-manager` in all commands below.**

Requires Node.js ≥ 20. [GitHub CLI](https://cli.github.com/) (`gh`) recommended for auth.

## Key Paths

| Path                         | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `~/.agents/`                 | Git repo root (push/pull target)                        |
| `~/.agents/skills/`          | Canonical skills directory                              |
| `~/.agents/.skill-lock.json` | Lock file (**READ ONLY** — owned by vercel-labs/skills) |

## Authentication

Token resolved in order: `gh auth token` → `$GITHUB_TOKEN` → `$GH_TOKEN`.

**Before running any command**, verify authentication is available:

```bash
gh auth status 2>/dev/null || echo "No GitHub auth found."
```

If no authentication is found, guide the user through ONE of these options:

1. **Has `gh` CLI installed** → run `gh auth login`
2. **No `gh` CLI** → set environment variable: `export GITHUB_TOKEN=ghp_your_token_here`

Do NOT proceed with push/pull/link commands until authentication is confirmed.

## Commands

All commands below use `PKG="@tc9011/skills-manager"`. Set this variable first or replace `$PKG` with the full package name.

### push

Commit and push `~/.agents/` to GitHub.

```bash
PKG="@tc9011/skills-manager"
npx $PKG push                    # auto-generated commit message
npx $PKG push -m "add new skill" # custom message
```

First run auto-initializes git repo + prompts for remote. On conflict (remote ahead), rejects with instructions to pull first.

### pull

Pull from GitHub. Auto-runs `link` afterward unless skipped.

```bash
PKG="@tc9011/skills-manager"
npx $PKG pull --repo owner/name  # specify repo
npx $PKG pull                    # use existing remote
npx $PKG pull --skip-link        # pull only, don't auto-link
```

On rebase conflict, aborts and shows manual resolution steps.

### link (global)

Read `.skill-lock.json`, create **relative** symlinks from each agent's global skills directory to `~/.agents/skills/`.

```bash
PKG="@tc9011/skills-manager"
npx $PKG link                          # interactive multiselect
npx $PKG link --agents cursor opencode # non-interactive (skips prompt)
```

When `--agents` is provided, the prompt is skipped entirely. Selection is remembered across runs.

### link --project

Link or copy skills to current working directory. Three-step interactive flow (all skippable via flags):

1. **Select skills** (`--skills`) — choose which skills (none pre-selected)
2. **Copy or symlink** (`--mode`) — copy (default, recommended) or absolute symlinks
3. **Select agents** (`--agents`) — choose agents for project-level setup

```bash
PKG="@tc9011/skills-manager"
cd /path/to/project
npx $PKG link --project                                              # interactive
npx $PKG link --project --agents cursor --skills my-skill --mode copy # non-interactive
```

Agents sharing the same projectPath are deduplicated.

## Common Workflows

### First-time setup (new machine)

```bash
PKG="@tc9011/skills-manager"
npx $PKG pull --repo owner/my-skills   # clone + auto-link
```

### Daily sync

```bash
PKG="@tc9011/skills-manager"
npx $PKG pull    # fetch latest + re-link
npx $PKG push    # backup local changes
```

### Project-level skills

```bash
PKG="@tc9011/skills-manager"
cd /path/to/project
npx $PKG link --project
# Creates e.g. .agents/skills/, .claude/skills/ in CWD
```

## Supported Agents (41)

- **10 universal** (share `.agents/skills` projectPath): amp, cline, codex, cursor, gemini-cli, github-copilot, kimi-cli, opencode, replit, universal
- **31 non-universal** (agent-specific paths): claude-code (`.claude/skills`), windsurf (`.windsurf/skills`), trae (`.trae/skills`), roo (`.roo/skills`), etc.

## Constraints

- `.skill-lock.json` is READ ONLY — never modify it
- `~/.agents/` is the git repo root (not `~/.agents/skills/`)
- Global link = relative symlinks; project link = absolute symlinks or copies
- Auth tokens are transient in-memory only — never persisted to `.git/config`
