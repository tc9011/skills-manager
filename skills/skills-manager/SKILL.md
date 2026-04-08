---
name: skills-manager
description: Manage AI agent skills backup and sync via the skills-manager CLI. Use when the user asks to push skills to GitHub, pull skills from GitHub, link or symlink skills to agents, sync skills across machines, set up project-level skills, or manage the ~/.agents/ directory. Also triggers on "sm push", "sm pull", "sm link", "backup my skills", "restore skills on new machine", "link --project", "project skills setup", "sync agents skills", or any question about the skills-manager or sm CLI.
---

# skills-manager CLI

CLI companion to [vercel-labs/skills](https://github.com/vercel-labs/skills) — backup, restore, and symlink AI agent skills via GitHub.

> **Scope boundary:** This tool backs up and syncs skills you already have. It does NOT install new skills from the registry — that's `npx skills add`. If the user wants to install a new skill, point them to `npx skills add <repo>` instead.

## Quick Reference

| Goal | Command |
|------|---------|
| Backup skills to GitHub | `sm push` |
| Restore skills on new machine | `sm pull --repo owner/name` |
| Re-link skills to agents | `sm link` |
| Link skills to a project | `sm link --project` |

## Invocation

```bash
# If globally installed
sm push          # short alias
skills-manager push  # full name

# Without installing — use the bundled wrapper script
export SM="$HOME/.agents/skills/skills-manager/scripts/sm.sh"
"$SM" push
```

Requires Node.js >= 20. [GitHub CLI](https://cli.github.com/) (`gh`) recommended for auth.

If neither `sm` nor `skills-manager` is found, install first:

```bash
npm install -g @tc9011/skills-manager
```

## Key Paths

| Path | Purpose |
|------|---------|
| `~/.agents/` | Git repo root (push/pull target) |
| `~/.agents/skills/` | Canonical skills directory |
| `~/.agents/.skill-lock.json` | Lock file (**READ ONLY** — owned by vercel-labs/skills) |

## Authentication

Auth is **optional**. If git already has credentials configured (SSH keys, macOS Keychain, credential manager, etc.), push/pull work without any extra setup.

When git cannot authenticate on its own, the CLI looks for a token in this order:

1. `gh auth token` — GitHub CLI (recommended)
2. `$GITHUB_TOKEN` — environment variable
3. `$GH_TOKEN` — environment variable

If none are found, git attempts the operation without a token — this works for public repos but fails for private ones.

**The `link` command never requires authentication.**

### Fixing Auth Failures

If push/pull fails with a permission or authentication error:

1. **Check if `gh` is installed:** run `gh --version`
2. **If `gh` exists:** run `gh auth login` to authenticate, then retry
3. **If `gh` missing:** set a token: `export GITHUB_TOKEN=ghp_your_token_here`, then retry
4. **If using SSH:** ensure `~/.ssh/` has a valid key added to GitHub and `origin` uses the `git@github.com:` URL format

Tokens are used transiently in-memory — they are never persisted to `.git/config`.

## Commands

### push

Commit and push `~/.agents/` to GitHub.

```bash
sm push                    # auto-generated commit message
sm push -m "add new skill" # custom message
```

**First-time behavior:**
1. If `~/.agents/` is not a git repo, auto-runs `git init`
2. If no `origin` remote exists, prompts for `owner/name`
3. If `gh` CLI is installed, offers to create the repo on GitHub automatically
4. If `gh` is not installed, shows a note telling the user to create the repo manually at https://github.com/new

**Possible outcomes:**
- `Skills pushed successfully!` — new commit created and pushed
- `Unpushed commits pushed successfully!` — working tree clean, but local was ahead
- `No changes to push — already up to date.` — nothing new
- `Push rejected` — see Troubleshooting below

### pull

Pull from GitHub. Auto-runs `link` afterward unless `--skip-link` is passed.

```bash
sm pull --repo owner/name  # first time — specify repo
sm pull                    # subsequent runs — uses existing remote
sm pull --skip-link        # pull only, don't re-link
```

**First-time behavior:**
- If no `--repo` and no existing `origin` remote, prompts for `owner/name`
- If `~/.agents/` doesn't exist yet, clones into it

**Possible outcomes:**
- `Skills cloned successfully!` — fresh clone on new machine, auto-runs link
- `Skills updated from remote.` — pulled new changes, auto-runs link
- `Already up to date.` — no new changes, skips link
- `Rebase conflict` — see Troubleshooting below

### link (global mode)

Read `.skill-lock.json`, create **relative** symlinks from each agent's global skills directory to `~/.agents/skills/`.

```bash
sm link                              # interactive prompt
sm link --agents cursor opencode     # non-interactive, skip prompt
```

**Interactive behavior:**

The agent selector has two sections:
1. **Locked section** — 10 universal agents (amp, cline, codex, cursor, gemini-cli, github-copilot, kimi-cli, opencode, replit, universal) are always included because they share `~/.agents/skills/` as their path.
2. **Searchable list** — 31 non-universal agents. Type to search/filter.

Pre-selection priority: saved config > `.skill-lock.json` > agents already existing on disk.

When `--agents` is provided, the interactive prompt is skipped entirely. Use this for scripting and AI agent automation:

```bash
sm link --agents cursor opencode claude-code
```

### link --project

Link or copy skills to the **current working directory**.

```bash
sm link --project                                                       # interactive
sm link --project --agents cursor claude-code --skills my-skill         # non-interactive (copy is default)
sm link --project --agents cursor claude-code --skills my-skill --mode symlink  # explicit symlink
```

**Interactive flow (3 steps):**
1. **Select skills** (`--skills` to skip) — choose which skills to include
2. **Select copy/symlink** — in practice this prompt is skipped because `--mode` defaults to `copy` in the CLI. Only appears if `linkCommand` is called programmatically without defaults
3. **Select agents** (`--agents` to skip) — same searchable multiselect with locked universal section

**Copy vs symlink:**
- `copy` (default, recommended) — creates independent files in project. Overwrites existing skill dirs
- `symlink` — creates absolute symlinks pointing to `~/.agents/skills/`. Existing non-symlink dirs are skipped

Agents that share the same `projectPath` (e.g., `trae` and `trae-cn` both use `.trae/skills`) are deduplicated — one operation per unique path.

**For AI agents: the fully non-interactive version is almost always what you want:**

```bash
sm link --project --agents cursor opencode claude-code --skills my-skill --mode copy
```

## Common Workflows

### First-time setup on a new machine

```bash
npm install -g @tc9011/skills-manager
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
sm link --project --skills my-skill --agents cursor opencode claude-code
```

### Re-link after installing new skills

```bash
npx skills add some-repo       # install via vercel-labs/skills
sm link                         # re-link to all agents
sm push                         # backup the new skill
```

## Troubleshooting

### Push rejected (remote ahead)

**Error:** `Push rejected — remote contains commits that you do not have locally.`

**Fix:**
```bash
sm pull      # pulls and rebases
sm push      # retry
```

Or manually:
```bash
cd ~/.agents
git pull --rebase origin main
sm push
```

### Rebase conflict on pull

**Error:** `Rebase conflict detected. Your local skills have diverged from the remote.`

The CLI auto-aborts the failed rebase. To resolve:

```bash
cd ~/.agents
git fetch origin
git rebase origin/main     # resolve conflicts manually
# OR if you want to discard local changes:
git reset --hard origin/main
```

### No skills found

**Error:** `No skills found in ~/.agents/skills.`

This means `~/.agents/skills/` is empty or doesn't exist. Either:
- Run `sm pull --repo owner/name` to restore from backup
- Install skills via `npx skills add <repo>`

### Unknown agent IDs

**Error:** `Unknown agent ID(s): foo. Run with no --agents to see available IDs.`

The `--agents` flag only accepts valid agent IDs from the 41-agent registry. Run `sm link` without `--agents` to see the interactive list.

### Auth failure during push/pull

**Symptom:** Git errors like `Authentication failed`, `Permission denied`, or `Repository not found`.

This means git has no credentials and no token was found. See the "Fixing Auth Failures" section above.

### ~/.agents/ is not a git repo

On first `push` or `pull`, the CLI auto-initializes git. If this somehow fails:

```bash
cd ~/.agents
git init
git remote add origin https://github.com/owner/my-skills.git
sm push
```

## Supported Agents (41)

- **10 universal** (always locked in interactive prompts): amp, cline, codex, cursor, gemini-cli, github-copilot, kimi-cli, opencode, replit, universal
- **31 non-universal** (appear in searchable list): claude-code, windsurf, trae, roo, augment, continue, goose, kilo, kode, and more

## Constraints

- `.skill-lock.json` is READ ONLY — never create, modify, or delete it
- `~/.agents/` is the git repo root (not `~/.agents/skills/`)
- Global link = relative symlinks; project link = absolute symlinks or copies
- Auth tokens are transient in-memory only — never persisted to `.git/config`
- This tool does NOT install skills from the registry — use `npx skills add` for that
