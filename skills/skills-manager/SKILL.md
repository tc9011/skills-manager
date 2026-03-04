---
name: skills-manager
description: Manage AI agent skills backup and sync via the skills-manager CLI. Use when the user asks to push skills to GitHub, pull skills from GitHub, link/symlink skills to agents, sync skills across machines, set up project-level skills, or manage the ~/.agents/ directory. Triggers on "push skills", "pull skills", "link skills", "sync skills", "backup skills", "restore skills", "skills-manager", "link --project", "project skills setup".
---

# skills-manager CLI

CLI companion to [vercel-labs/skills](https://github.com/vercel-labs/skills) — backup, restore, and symlink AI agent skills via GitHub.

## Install

```bash
npx skills-manager push              # run directly (no install needed)
npm install -g @tc9011/skills-manager # or install globally
```

**If installed globally, replace `npx skills-manager` with `skills-manager` in all commands below.**

Requires Node.js ≥ 20. [GitHub CLI](https://cli.github.com/) (`gh`) recommended for auth.

## Key Paths

| Path                         | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `~/.agents/`                 | Git repo root (push/pull target)                        |
| `~/.agents/skills/`          | Canonical skills directory                              |
| `~/.agents/.skill-lock.json` | Lock file (**READ ONLY** — owned by vercel-labs/skills) |

## Authentication

Authentication is **optional**. If git already has credentials configured (SSH keys, macOS Keychain, `git credential-manager`, etc.), no extra setup is needed.

If git cannot authenticate on its own, the CLI will try these token sources in order:

1. `gh auth token` — GitHub CLI
2. `$GITHUB_TOKEN` — environment variable
3. `$GH_TOKEN` — environment variable

If push/pull fails with an auth error, guide the user to set up ONE of:

1. **Has `gh` CLI** → `gh auth login`
2. **No `gh` CLI** → `export GITHUB_TOKEN=ghp_your_token_here`

## Commands

### push

Commit and push `~/.agents/` to GitHub.

```bash
npx skills-manager push                    # auto-generated commit message
npx skills-manager push -m "add new skill" # custom message
```

First run auto-initializes git repo + prompts for remote. On conflict (remote ahead), rejects with instructions to pull first.

### pull

Pull from GitHub. Auto-runs `link` afterward unless skipped.

```bash
npx skills-manager pull --repo owner/name  # specify repo
npx skills-manager pull                    # use existing remote
npx skills-manager pull --skip-link        # pull only, don't auto-link
```

On rebase conflict, aborts and shows manual resolution steps.

### link (global)

Read `.skill-lock.json`, create **relative** symlinks from each agent's global skills directory to `~/.agents/skills/`.

```bash
npx skills-manager link                          # interactive multiselect
npx skills-manager link --agents cursor opencode # non-interactive (skips prompt)
```

When `--agents` is provided, the prompt is skipped entirely. Selection is remembered across runs.

### link --project

Link or copy skills to current working directory. Three-step interactive flow (all skippable via flags):

1. **Select skills** (`--skills`) — choose which skills (none pre-selected)
2. **Copy or symlink** (`--mode`) — copy (default, recommended) or absolute symlinks
3. **Select agents** (`--agents`) — choose agents for project-level setup

```bash
cd /path/to/project
npx skills-manager link --project                                              # interactive
npx skills-manager link --project --agents cursor --skills my-skill --mode copy # non-interactive
```

Agents sharing the same projectPath are deduplicated.

## Common Workflows

### First-time setup (new machine)

```bash
npx skills-manager pull --repo owner/my-skills   # clone + auto-link
```

### Daily sync

```bash
npx skills-manager pull    # fetch latest + re-link
npx skills-manager push    # backup local changes
```

### Project-level skills

```bash
cd /path/to/project
npx skills-manager link --project
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
