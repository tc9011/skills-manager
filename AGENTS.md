# AGENTS.md - Skills Manager

This file provides context for AI coding agents working on this codebase.

## Project Overview

**Skills Manager** is a Tauri v2 desktop application for managing "skills" - reusable instruction sets for AI coding agents (OpenCode, Claude Code, Cursor).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS v4 (`@theme` directive, NOT v3 CSS variables) |
| UI Components | shadcn/ui, Radix UI |
| Icons | lucide-react |
| Backend | Rust, Tauri 2 |
| Plugins | tauri-plugin-fs, tauri-plugin-shell, tauri-plugin-dialog, tauri-plugin-opener |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Global  │ │ Project │ │  Sync   │       │
│  │  Tab    │ │   Tab   │ │   Tab   │       │
│  └────┬────┘ └────┬────┘ └────┬────┘       │
│       │           │           │             │
│       └───────────┴───────────┘             │
│                       │                                  │
│              invoke() │ (IPC)                           │
└───────────────────────┼─────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────┐
│                       ▼                                  │
│               Tauri Commands (Rust)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ skills.rs   │ │  sync.rs    │ │ settings.rs │       │
│  │ - scan      │ │ - git ops   │ │ - config    │       │
│  │ - add/remove│ │ - clone/pull│ │ - save/load │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## Key Directories

| Path | Purpose |
|------|---------|
| `src/` | React frontend code |
| `src/components/ui/` | shadcn/ui components (do not edit manually) |
| `src/components/skills/` | Skill-related components |
| `src/components/sync/` | GitHub sync panel |
| `src/components/settings/` | Settings dialog |
| `src/components/project/` | Project skills panel |
| `src-tauri/src/commands/` | Rust Tauri commands |
| `src-tauri/capabilities/` | Tauri permission configuration |

## Important Patterns

### Tailwind CSS v4
Uses `@theme` directive in `src/index.css`, NOT CSS variables with `@apply`:
```css
@theme {
  --color-background: oklch(0.145 0 0);
  --color-primary: oklch(0.7 0.15 250);
}
```

### Tauri Commands
Commands are defined in Rust and invoked from frontend:

```rust
// src-tauri/src/commands/skills.rs
#[tauri::command]
pub fn scan_global_skills() -> Result<Vec<Skill>, String> { ... }
```

```typescript
// Frontend
const skills = await invoke<Skill[]>("scan_global_skills");
```

### Skill Structure
Each skill is a directory with a `SKILL.md` file:
```yaml
---
name: skill-name
description: "Skill description"
---
# Content...
```

## File Locations

| Data | Path |
|------|------|
| Global skills | `~/.agents/skills/` |
| OpenCode skills | `~/.config/opencode/skills/` |
| Claude skills | `~/.claude/skills/` |
| Cursor skills | `~/.cursor/skills/` |
| App settings | `~/.config/skills-manager/settings.json` |
| Sync config | `~/.config/skills-manager/config.json` |

## Common Tasks

### Add a new Tauri command

1. Create function in `src-tauri/src/commands/<module>.rs`
2. Add `#[tauri::command]` attribute
3. Export from `src-tauri/src/commands/mod.rs`
4. Import in `src-tauri/src/lib.rs`
5. Add to `generate_handler![]` macro
6. Call from frontend with `invoke()`

### Add a new UI component

1. Use shadcn/ui: `npx shadcn@latest add <component>`
2. Component appears in `src/components/ui/`
3. Import and use in your component

### Add permissions for new Tauri plugin

1. Add to `src-tauri/Cargo.toml`
2. Initialize in `src-tauri/src/lib.rs` with `.plugin()`
3. Add permissions to `src-tauri/capabilities/default.json`

## Build & Test Commands

```bash
pnpm dev:tauri      # Development mode (frontend + Rust hot reload)
pnpm build:tauri    # Production build
pnpm check:all      # TypeScript + Rust type checking
pnpm check:rust     # Rust only: cargo check
```

## Known Constraints

1. **Tailwind v4**: Do NOT use `@apply` with custom colors - use CSS variables directly
2. **shadcn/ui**: Components in `src/components/ui/` are generated - avoid manual edits
3. **Tauri permissions**: Any new file/shell access needs explicit permission in `capabilities/default.json`
4. **Type safety**: Never use `as any` or `@ts-ignore`

## Debugging

- **Frontend DevTools**: `Cmd+Option+I` in app
- **Rust logs**: `println!()` → terminal running `pnpm dev:tauri`
- **TypeScript errors**: `pnpm check`
- **Rust errors**: `pnpm check:rust`
