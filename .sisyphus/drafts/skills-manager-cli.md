# Draft: Skills Manager CLI Tool

## Background / Discovery

### Existing Project State
- **Git repo has 20+ commits** of a **Tauri v2 desktop app** called "Skill Sync"
- Working tree is currently **wiped** (only `.git/` exists)
- The Tauri app had: React 19 frontend, Rust backend, 40+ agent support, GitHub sync, symlink management
- **User is pivoting from desktop app → CLI tool** (needs confirmation)

### Reference: vercel-labs/skills (v1.4.3)
- Very mature CLI tool (`npx skills`) with 7.6k stars
- Supports **40+ agents** with defined project/global paths
- Commands: `add`, `list`, `find`, `remove`, `check`, `update`, `init`
- Uses symlinks (recommended) or copy for multi-agent installation
- Skill format: `SKILL.md` with YAML frontmatter (name + description)
- Does NOT have: backup/push/pull to personal GitHub repo, lock file tracking

### Key Gap vs vercel-labs/skills
The user wants something vercel-labs/skills does NOT do:
1. **Personal backup** — push YOUR skills to YOUR GitHub repo
2. **Restore with agent mapping** — pull from backup, auto-symlink to agents based on `.skill-lock.json`
3. **Lock file** — track which skills go to which agents (`lastSelectedAgents`)

## Requirements (confirmed)

- **Runtime**: Node.js + tsx (user chose this over Bun/Deno)
- **GitHub Strategy**: 专用 GitHub Repo (dedicated repo for skill backup)
- **Supported Agents**: Match vercel-labs/skills agent list (40+ agents)
- **CLI Style**: `skills push` / `skills pull` pattern (git-like)

## Technical Decisions

- **Agent registry**: Follow vercel-labs/skills agent definitions (agent name → project path → global path)
- **Skill format**: SKILL.md with YAML frontmatter (compatible with vercel-labs/skills ecosystem)

## Open Questions

1. **Pivot confirmation**: Abandon the Tauri app and start fresh as a pure CLI?
2. **Relationship to vercel-labs/skills**: Complement it? Replace it? Fork it?
3. **Scope boundaries**: Just push/pull/symlink? Or also add/remove/find/update?
4. **Lock file schema**: What exactly should `.skill-lock.json` track?
5. **Skills source**: Where do skills live canonically before push? (`~/.agents/skills/`?)
6. **Authentication**: GitHub CLI (gh auth) token reuse? Or own token management?
7. **Naming**: What should the CLI be called? `skills-sync`? `skill-manager`? `skills`?

## Scope Boundaries
- INCLUDE: TBD
- EXCLUDE: TBD

## Research Findings
- **vercel-labs/skills**: Mature reference implementation, TypeScript, pnpm, Commander.js-style
- **Existing Tauri app**: Has canonical storage at `~/.agents/skills/` with symlinks to agent dirs
- **Agent paths**: Comprehensive list from vercel-labs/skills README (40+ agents)
