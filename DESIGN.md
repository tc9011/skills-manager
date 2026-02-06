# Skills Manager - Design Document

## Overview

Skills Manager is a cross-platform desktop application that provides a graphical interface for managing "skills" - reusable instruction sets for AI coding agents.

### Problem Statement

AI coding agents (OpenCode, Claude Code, Cursor) use skills stored in various directories. Managing these skills manually is tedious:
- Skills are scattered across multiple directories
- No visual way to browse or search skills
- Manual symlink management for multi-agent setups
- No easy way to sync skills across machines

### Solution

A unified desktop app that:
- Provides a single view of all skills
- Handles symlink management automatically
- Integrates with Git for backup/sync

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Skills Manager App                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   React Frontend                        │ │
│  │                                                          │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │ │
│  │  │  Global  │ │ Project  │ │   Sync   │   │ │
│  │  │   Tab    │ │   Tab    │ │   Tab    │   │ │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘   │ │
│  │       │            │            │          │ │
│  │       └────────────┴────────────┘          │ │
│  │                         │                                │ │
│  │                    invoke()                              │ │
│  └─────────────────────────┼────────────────────────────────┘ │
│                            │ IPC                             │
│  ┌─────────────────────────┼────────────────────────────────┐ │
│  │                         ▼                                │ │
│  │                 Tauri Commands (Rust)                    │ │
│  │                                                          │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │ │
│  │  │  skills.rs  │ │   sync.rs   │ │ settings.rs │        │ │
│  │  ├─────────────┤ ├─────────────┤ ├─────────────┤        │ │
│  │  │ scan_global │ │ git_clone   │ │ get_settings│        │ │
│  │  │ scan_project│ │ git_pull    │ │ save_settings│       │ │
│  │  │ add_skill   │ │ git_push    │ │             │        │ │
│  │  │ remove_skill│ │ git_status  │ │             │        │ │
│  │  │ delete_skill│ │             │ │             │        │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘        │ │
│  │                         │                                │ │
│  └─────────────────────────┼────────────────────────────────┘ │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      File System                             │
│                                                              │
│  ~/.agents/skills/          (canonical skill storage)        │
│  ~/.config/opencode/skills/ (OpenCode symlinks)              │
│  ~/.claude/skills/          (Claude Code symlinks)           │
│  ~/.cursor/skills/          (Cursor symlinks)                │
│  ~/.config/skills-manager/  (app config)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Diagram

```
Frontend Components
├── App.tsx                 # Main layout, tab navigation
├── components/
│   ├── skills/
│   │   ├── SkillsList.tsx      # Grid of skill cards
│   │   ├── SkillCard.tsx       # Individual skill display
│   │   ├── AddSkillDialog.tsx  # Add skill by name
│   │   └── SkillDetailDialog.tsx # View/delete skill
│   ├── project/
│   │   └── ProjectPanel.tsx    # Project folder skills
│   ├── sync/
│   │   └── SyncPanel.tsx       # Git sync interface
│   ├── settings/
│   │   └── SettingsDialog.tsx  # App configuration
│   └── ui/                     # shadcn/ui components
└── hooks/
    └── useSkills.ts            # Skill fetching hook
```

---

## Data Models

### Skill

```typescript
interface Skill {
  name: string;           // Skill identifier
  description: string;    // From SKILL.md frontmatter
  path: string;           // Absolute path to skill directory
  source: SkillSource;    // local | remote | symlink
  installed_in: string[]; // ["opencode", "claude", "cursor"]
}

enum SkillSource {
  Local = "local",
  Remote = "remote",
  Symlink = "symlink"
}
```

### Skill File Structure

```
skill-name/
└── SKILL.md

# SKILL.md format:
---
name: skill-name
description: "Brief description of the skill"
---

# Skill Title

Detailed instructions and content...
```

### App Settings

```typescript
interface AppSettings {
  global_skills_path: string;  // Default: ~/.agents/skills
  agents: AgentConfig[];
}

interface AgentConfig {
  name: string;     // Display name
  id: string;       // Identifier
  enabled: boolean; // Whether to manage this agent
  path: string;     // Skills directory path
}
```

### Sync Config

```typescript
interface SyncConfig {
  repo_url: string | null;
  branch: string;
  auto_sync: boolean;
  last_sync: string | null; // ISO timestamp
}
```

---

## Feature Specifications

### 1. Global Skills Tab

**Purpose**: View and manage skills in the canonical storage location.

**Behavior**:
1. On mount, scan `~/.agents/skills/` for directories containing `SKILL.md`
2. Parse frontmatter to extract name and description
3. Check which agent directories contain symlinks to each skill
4. Display as a searchable grid of cards

**Actions**:
- Click card → Open detail dialog (view content, delete)
- Add Skill button → Run `npx skills add <name>`
- Refresh → Re-scan directory

### 2. Project Skills Tab

**Purpose**: Manage skills within a specific project folder.

**Behavior**:
1. User selects a folder via native dialog
2. Scan these locations within the folder:
   - `.opencode/skill/`
   - `.opencode/skills/`
   - `.claude/skill/`
   - `.claude/skills/`
   - `.cursor/skill/`
   - `.cursor/skills/`
   - `.agents/skills/`
3. Display found skills

**Actions**:
- Open Folder → Native folder picker
- Change Folder → Select different project
- Refresh → Re-scan current project

### 3. Sync Tab

**Purpose**: Sync skills with a Git repository.

**States**:
1. **Not connected**: Show setup form (repo URL, branch)
2. **Connected**: Show pull/push controls

**Actions**:
- Clone Repository → `git clone` to `~/.agents/skills/`
- Pull Changes → `git pull --rebase`
- Commit & Push → `git add . && git commit -m "..." && git push`
- Refresh Status → Check git status

### 5. Settings Dialog

**Purpose**: Configure app preferences.

**Settings**:
- Global skills path (with folder picker)
- Agent configurations:
  - Enable/disable each agent
  - Custom paths for each agent

**Persistence**: `~/.config/skills-manager/settings.json`

---

## Technical Decisions

### Why Tauri v2?

| Consideration | Electron | Tauri |
|---------------|----------|-------|
| Bundle size | ~150MB | ~10MB |
| Memory usage | High | Low |
| Native feel | Chromium | System WebView |
| Security | Process isolation | Rust + capability-based |
| Startup time | Slow | Fast |

Tauri v2 provides native performance with a small footprint, ideal for a utility app.

### Why React 19?

- Familiar ecosystem for UI development
- Excellent TypeScript support
- Large component library availability (shadcn/ui)
- React 19 features (use, actions) for future enhancements

### Why Tailwind CSS v4?

- Zero-runtime CSS generation
- `@theme` directive for clean theming
- Native dark mode support
- Consistent with shadcn/ui components

### File System Strategy

```
Canonical Storage: ~/.agents/skills/
├── skill-a/
│   └── SKILL.md
└── skill-b/
    └── SKILL.md

Agent Directories (symlinks):
~/.config/opencode/skills/skill-a → ~/.agents/skills/skill-a
~/.claude/skills/skill-a → ~/.agents/skills/skill-a
~/.cursor/skills/skill-a → ~/.agents/skills/skill-a
```

**Rationale**:
- Single source of truth for skills
- Agents read from their expected locations via symlinks
- Git sync only needs to track one directory
- Easy to add new agents without duplicating files

---

## Security Considerations

### Tauri Capabilities

All file system and shell access is explicitly declared in `src-tauri/capabilities/default.json`:

```json
{
  "permissions": [
    "fs:allow-read-dir",   // Read skill directories
    "fs:allow-read-file",  // Read SKILL.md files
    "fs:allow-exists",     // Check directory existence
    "shell:allow-spawn",   // Run npx, git commands
    "dialog:default"       // Native file dialogs
  ]
}
```

### Input Validation

- Skill names are validated before passing to shell commands
- Paths are checked to ensure they're within expected directories
- Git operations are sandboxed to `~/.agents/skills/`

---

## Future Roadmap

### Phase 1 (Current) ✅
- [x] Global skills management
- [x] Project skills scanning
- [x] GitHub sync (clone, pull, push)
- [x] Settings configuration

### Phase 2
- [ ] Online skill registry API
- [ ] Skill versioning and updates
- [ ] Skill templates/scaffolding
- [ ] Keyboard shortcuts

### Phase 3
- [ ] Skill editor (create/edit SKILL.md)
- [ ] Skill testing/validation
- [ ] Team/organization sharing
- [ ] Cloud sync (non-Git)

### Phase 4
- [ ] Plugin system for custom agents
- [ ] Skill analytics (usage tracking)
- [ ] AI-powered skill recommendations

---

## File Manifest

```
skills-manager/
├── README.md                 # Project overview
├── AGENTS.md                 # AI agent context
├── DESIGN.md                 # This document
├── package.json              # Frontend dependencies
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite bundler config
├── tailwind.config.ts        # Tailwind config
├── components.json           # shadcn/ui config
├── src/
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # React entry point
│   ├── index.css             # Global styles + @theme
│   ├── lib/utils.ts          # Utility functions
│   ├── types/skill.ts        # TypeScript types
│   ├── hooks/useSkills.ts    # Data fetching hook
│   └── components/
│       ├── ui/               # shadcn/ui (generated)
│       ├── skills/           # Skill components
│       ├── project/          # Project panel
│       ├── sync/             # Sync panel
│       └── settings/         # Settings dialog
└── src-tauri/
    ├── Cargo.toml            # Rust dependencies
    ├── tauri.conf.json       # Tauri configuration
    ├── capabilities/
    │   └── default.json      # Permission config
    └── src/
        ├── main.rs           # Rust entry point
        ├── lib.rs            # Command registration
        └── commands/
            ├── mod.rs        # Module exports
            ├── skills.rs     # Skill commands
            ├── sync.rs       # Git commands
            └── settings.rs   # Settings commands
```

---

## References

- [Tauri v2 Documentation](https://tauri.app/)
- [React 19 Release Notes](https://react.dev/blog)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [OpenCode Skills CLI](https://github.com/opencode-ai/skills)
