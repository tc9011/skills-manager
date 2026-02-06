# Skills Manager - Four Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 4 major features: Expand Agent Support (40+ agents), GitHub Token Authentication, Multi-Project Support with Persistence, and Copy Skills between Global/Project.

**Architecture:** Foundation-first approach. Start with Agent Support (affects data structures), then Token Auth (enables Sync), then Multi-Project (UX improvement), finally Copy Skills (enhancement).

**Tech Stack:** Tauri v2, React 19, TypeScript, Rust, Tailwind CSS v4, shadcn/ui

---

## TL;DR

> **Quick Summary**: Add 40+ agent support, GitHub token auth for passwordless git, multi-project tabs with persistence, and copy/move skills between global and project directories.
>
> **Deliverables**:
> - Settings expanded to 40 agents with scrollable UI
> - Token input in Sync tab, stored securely, used in git operations
> - Multiple projects open as tabs, persisted across restarts
> - Copy skill actions in Global and Project panels
>
> **Estimated Effort**: High (8-12 hours)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Feature 4 (Agents) → Feature 1 (Token) → Feature 2 (Multi-Project) → Feature 3 (Copy Skills)

---

## Context

### Current State
- App has 3 tabs: Global, Project, Sync
- Only 3 agents supported: OpenCode, Claude Code, Cursor
- Git operations require username/password on each operation
- Single project selection, not persisted
- No skill copy functionality

### Research Findings

**40 Agents from vercel-labs/skills:**
| Agent | ID | Global Path | Project Path |
|-------|-----|-------------|--------------|
| Amp | amp | ~/.config/agents/skills/ | .agents/skills/ |
| Kimi Code CLI | kimi-cli | ~/.config/agents/skills/ | .agents/skills/ |
| Replit | replit | ~/.config/agents/skills/ | .agents/skills/ |
| Antigravity | antigravity | ~/.gemini/antigravity/skills/ | .agent/skills/ |
| Augment | augment | ~/.augment/skills/ | .augment/skills/ |
| Claude Code | claude-code | ~/.claude/skills/ | .claude/skills/ |
| OpenClaw | openclaw | ~/.moltbot/skills/ | skills/ |
| Cline | cline | ~/.cline/skills/ | .cline/skills/ |
| CodeBuddy | codebuddy | ~/.codebuddy/skills/ | .codebuddy/skills/ |
| Codex | codex | ~/.codex/skills/ | .agents/skills/ |
| Command Code | command-code | ~/.commandcode/skills/ | .commandcode/skills/ |
| Continue | continue | ~/.continue/skills/ | .continue/skills/ |
| Crush | crush | ~/.config/crush/skills/ | .crush/skills/ |
| Cursor | cursor | ~/.cursor/skills/ | .cursor/skills/ |
| Droid | droid | ~/.factory/skills/ | .factory/skills/ |
| Gemini CLI | gemini-cli | ~/.gemini/skills/ | .agents/skills/ |
| GitHub Copilot | github-copilot | ~/.copilot/skills/ | .agents/skills/ |
| Goose | goose | ~/.config/goose/skills/ | .goose/skills/ |
| Junie | junie | ~/.junie/skills/ | .junie/skills/ |
| iFlow CLI | iflow-cli | ~/.iflow/skills/ | .iflow/skills/ |
| Kilo Code | kilo | ~/.kilocode/skills/ | .kilocode/skills/ |
| Kiro CLI | kiro-cli | ~/.kiro/skills/ | .kiro/skills/ |
| Kode | kode | ~/.kode/skills/ | .kode/skills/ |
| MCPJam | mcpjam | ~/.mcpjam/skills/ | .mcpjam/skills/ |
| Mistral Vibe | mistral-vibe | ~/.vibe/skills/ | .vibe/skills/ |
| Mux | mux | ~/.mux/skills/ | .mux/skills/ |
| OpenCode | opencode | ~/.config/opencode/skills/ | .agents/skills/ |
| OpenHands | openhands | ~/.openhands/skills/ | .openhands/skills/ |
| Pi | pi | ~/.pi/agent/skills/ | .pi/skills/ |
| Qoder | qoder | ~/.qoder/skills/ | .qoder/skills/ |
| Qwen Code | qwen-code | ~/.qwen/skills/ | .qwen/skills/ |
| Roo Code | roo | ~/.roo/skills/ | .roo/skills/ |
| Trae | trae | ~/.trae/skills/ | .trae/skills/ |
| Trae CN | trae-cn | ~/.trae-cn/skills/ | .trae/skills/ |
| Windsurf | windsurf | ~/.codeium/windsurf/skills/ | .windsurf/skills/ |
| Zencoder | zencoder | ~/.zencoder/skills/ | .zencoder/skills/ |
| Neovate | neovate | ~/.neovate/skills/ | .neovate/skills/ |
| Pochi | pochi | ~/.pochi/skills/ | .pochi/skills/ |
| AdaL | adal | ~/.adal/skills/ | .adal/skills/ |

**Token Auth Approach:**
- Store token in app settings (not keychain for simplicity)
- Use token in git URL: `https://<token>@github.com/...`
- Frontend encrypts/decrypts with simple obfuscation (not military-grade, but better than plaintext)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation):
└── Task 1: Expand AgentConfig in Rust settings (40 agents)
└── Task 2: Update DEFAULT_AGENTS in SettingsDialog.tsx

Wave 2 (Token Auth - depends on Wave 1):
└── Task 3: Add GitHub token to settings (Rust)
└── Task 4: Add token input UI in SyncPanel
└── Task 5: Use token in git operations

Wave 3 (Multi-Project - independent):
└── Task 6: Add project persistence to settings (Rust)
└── Task 7: Update ProjectPanel with tabs UI
└── Task 8: Persist projects in App.tsx state

Wave 4 (Copy Skills - depends on Wave 1):
└── Task 9: Add copy_skill Rust command
└── Task 10: Add copy actions to SkillCard and ProjectPanel
└── Task 11: Update documentation
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 9 | None |
| 2 | 1 | None | 3 |
| 3 | None | 4, 5 | 1, 2 |
| 4 | 3 | 5 | 6 |
| 5 | 4 | None | 7 |
| 6 | None | 7, 8 | 3, 4 |
| 7 | 6 | 8 | 5 |
| 8 | 7 | None | 9 |
| 9 | 1 | 10 | 6, 7 |
| 10 | 9 | 11 | 8 |
| 11 | All | None | None |

---

## TODOs

### Feature 4: Expand Agent Support (40+ agents)

---

- [ ] 1. Update Rust settings with 40 agents

  **What to do**:
  - Modify `src-tauri/src/commands/settings.rs`
  - Add `project_path` field to `AgentConfig` struct
  - Expand `Default::default()` for `AppSettings` to include all 40 agents
  - Keep agents sorted alphabetically by name

  **Must NOT do**:
  - DO NOT change get_app_settings or save_app_settings logic
  - DO NOT remove existing fields

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **References**:
  - `src-tauri/src/commands/settings.rs:6-11` - AgentConfig struct
  - `src-tauri/src/commands/settings.rs:19-45` - Default impl

  **Acceptance Criteria**:

  ```
  Scenario: Rust compiles with expanded agents
    Tool: Bash
    Steps:
      1. cd src-tauri && cargo check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: AgentConfig has project_path field
    Tool: Bash
    Steps:
      1. grep "project_path" src-tauri/src/commands/settings.rs
    Expected Result: Field found
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(settings): expand agent support to 40 agents with project paths`
  - Files: `src-tauri/src/commands/settings.rs`
  - Pre-commit: `cargo check`

---

- [ ] 2. Update SettingsDialog with scrollable agent list

  **What to do**:
  - Modify `src/components/settings/SettingsDialog.tsx`
  - Update `AgentConfig` interface to include `project_path`
  - Replace hardcoded `DEFAULT_AGENTS` with all 40 agents
  - Add ScrollArea around agent list
  - Add search/filter input for agents
  - Show both global and project paths per agent

  **Must NOT do**:
  - DO NOT change dialog header or save logic
  - DO NOT remove existing functionality

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **References**:
  - `src/components/settings/SettingsDialog.tsx:21-26` - AgentConfig interface
  - `src/components/settings/SettingsDialog.tsx:33-52` - DEFAULT_AGENTS array
  - `src/components/settings/SettingsDialog.tsx:158-201` - Agent list rendering

  **Acceptance Criteria**:

  ```
  Scenario: TypeScript compiles
    Tool: Bash
    Steps:
      1. pnpm check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: 40 agents in DEFAULT_AGENTS
    Tool: Bash
    Steps:
      1. grep -c "id:" src/components/settings/SettingsDialog.tsx
    Expected Result: At least 40 matches
    Evidence: Grep count
  ```

  **Commit**: YES
  - Message: `feat(settings): add scrollable UI for 40 agents with search filter`
  - Files: `src/components/settings/SettingsDialog.tsx`
  - Pre-commit: `pnpm check`

---

### Feature 1: GitHub Token Authentication

---

- [ ] 3. Add GitHub token to Rust settings

  **What to do**:
  - Modify `src-tauri/src/commands/settings.rs`
  - Add `github_token: Option<String>` to `AppSettings` struct
  - Update Default impl to set `github_token: None`
  
  - Modify `src-tauri/src/commands/sync.rs`
  - Add `get_github_token()` command to retrieve token from settings
  - Add `save_github_token(token: String)` command

  **Must NOT do**:
  - DO NOT implement encryption (keep simple for now)
  - DO NOT change existing sync commands

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **References**:
  - `src-tauri/src/commands/settings.rs:13-17` - AppSettings struct
  - `src-tauri/src/lib.rs:20-40` - Command registration

  **Acceptance Criteria**:

  ```
  Scenario: Rust compiles with token commands
    Tool: Bash
    Steps:
      1. cd src-tauri && cargo check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: Token commands exist
    Tool: Bash
    Steps:
      1. grep -c "github_token" src-tauri/src/commands/settings.rs
    Expected Result: At least 2 matches
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(settings): add GitHub token storage`
  - Files: `src-tauri/src/commands/settings.rs`, `src-tauri/src/lib.rs`
  - Pre-commit: `cargo check`

---

- [ ] 4. Add token input UI in SyncPanel

  **What to do**:
  - Modify `src/components/sync/SyncPanel.tsx`
  - Add token state: `const [githubToken, setGithubToken] = useState("")`
  - Add "GitHub Token" Card before Repository Status card
  - Token input with show/hide toggle (eye icon)
  - Save button to persist token
  - Load token on component mount

  **Must NOT do**:
  - DO NOT change existing git operation logic yet
  - DO NOT show token in console logs

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **References**:
  - `src/components/sync/SyncPanel.tsx:51-74` - loadStatus function
  - `src/components/sync/SyncPanel.tsx:230-268` - Repository Status card

  **Acceptance Criteria**:

  ```
  Scenario: TypeScript compiles
    Tool: Bash
    Steps:
      1. pnpm check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: Token input exists
    Tool: Bash
    Steps:
      1. grep -c "githubToken\|github_token" src/components/sync/SyncPanel.tsx
    Expected Result: At least 3 matches
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(sync): add GitHub token input UI`
  - Files: `src/components/sync/SyncPanel.tsx`
  - Pre-commit: `pnpm check`

---

- [ ] 5. Use token in git operations

  **What to do**:
  - Modify `src-tauri/src/commands/sync.rs`
  - Create helper function `inject_token_into_url(url: &str, token: &str) -> String`
    - Converts `https://github.com/user/repo.git` to `https://<token>@github.com/user/repo.git`
  - Modify `git_clone_repo`: Get token from settings, inject into URL
  - Modify `git_init_repo`: Same - inject token when setting remote
  - Modify `git_pull` and `git_push`: Check if remote has token, update if needed

  **Must NOT do**:
  - DO NOT log the token to console
  - DO NOT break operations when no token is set (fallback to normal auth)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **References**:
  - `src-tauri/src/commands/sync.rs:99-122` - git_init_repo
  - `src-tauri/src/commands/sync.rs:124-163` - git_clone_repo
  - `src-tauri/src/commands/sync.rs:165-174` - git_pull

  **Acceptance Criteria**:

  ```
  Scenario: Rust compiles
    Tool: Bash
    Steps:
      1. cd src-tauri && cargo check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: Token injection helper exists
    Tool: Bash
    Steps:
      1. grep "inject_token_into_url" src-tauri/src/commands/sync.rs
    Expected Result: Function found
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(sync): use GitHub token in git operations for passwordless auth`
  - Files: `src-tauri/src/commands/sync.rs`
  - Pre-commit: `cargo check`

---

### Feature 2: Multi-Project Support + Persistence

---

- [ ] 6. Add project persistence to Rust settings

  **What to do**:
  - Modify `src-tauri/src/commands/settings.rs`
  - Add `recent_projects: Vec<String>` to `AppSettings`
  - Add `active_projects: Vec<String>` to `AppSettings` (currently open)
  - Update Default impl

  **Must NOT do**:
  - DO NOT limit number of recent projects (let frontend handle)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **References**:
  - `src-tauri/src/commands/settings.rs:13-17` - AppSettings struct

  **Acceptance Criteria**:

  ```
  Scenario: Rust compiles
    Tool: Bash
    Steps:
      1. cd src-tauri && cargo check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: Project fields exist
    Tool: Bash
    Steps:
      1. grep -c "recent_projects\|active_projects" src-tauri/src/commands/settings.rs
    Expected Result: At least 2 matches
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(settings): add project persistence fields`
  - Files: `src-tauri/src/commands/settings.rs`
  - Pre-commit: `cargo check`

---

- [ ] 7. Update ProjectPanel with tabs UI for multiple projects

  **What to do**:
  - Modify `src/components/project/ProjectPanel.tsx`
  - Change state from single project to array: `projects: ProjectInfo[]`
  - Add horizontal tabs for open projects
  - Add "+" button to open another project
  - Add "x" button on each tab to close project
  - Show active project's skills below tabs
  - Add "Recent Projects" dropdown in empty state

  **Must NOT do**:
  - DO NOT limit number of open projects
  - DO NOT change skill scanning logic

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **References**:
  - `src/components/project/ProjectPanel.tsx:24-28` - Current single project state
  - `src/components/project/ProjectPanel.tsx:70-83` - Empty state UI

  **Acceptance Criteria**:

  ```
  Scenario: TypeScript compiles
    Tool: Bash
    Steps:
      1. pnpm check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: Multiple project state exists
    Tool: Bash
    Steps:
      1. grep "projects\|activeProject" src/components/project/ProjectPanel.tsx
    Expected Result: Array/multi-project patterns found
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(project): add multi-project tabs UI with recent projects dropdown`
  - Files: `src/components/project/ProjectPanel.tsx`
  - Pre-commit: `pnpm check`

---

- [ ] 8. Persist projects across tab switches and restarts

  **What to do**:
  - Modify `src/App.tsx`
  - Lift project state to App level or create context
  - Load active_projects from settings on mount
  - Save active_projects to settings when projects change
  - Pass projects state to ProjectPanel as props

  **Must NOT do**:
  - DO NOT block app startup if settings load fails

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`frontend-ui-ux`]

  **References**:
  - `src/App.tsx:21-26` - Current state declarations
  - `src/App.tsx:93-95` - ProjectPanel usage

  **Acceptance Criteria**:

  ```
  Scenario: TypeScript compiles
    Tool: Bash
    Steps:
      1. pnpm check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: Projects persisted
    Tool: Bash
    Steps:
      1. grep "active_projects\|save_app_settings" src/App.tsx
    Expected Result: Persistence patterns found
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(app): persist open projects across tab switches and restarts`
  - Files: `src/App.tsx`, `src/components/project/ProjectPanel.tsx`
  - Pre-commit: `pnpm check`

---

### Feature 3: Copy Skills Between Global and Project

---

- [ ] 9. Add copy_skill Rust command

  **What to do**:
  - Modify `src-tauri/src/commands/skills.rs`
  - Add `copy_skill(source_path: String, dest_dir: String) -> Result<String, String>`
    - Copies skill directory to destination
    - Returns path of copied skill
  - Add `symlink_skill(source_path: String, dest_dir: String) -> Result<String, String>`
    - Creates symlink instead of copy
  - Register both commands in `src-tauri/src/lib.rs`

  **Must NOT do**:
  - DO NOT overwrite existing skill without confirmation (return error)
  - DO NOT copy outside of known skill directories

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **References**:
  - `src-tauri/src/commands/skills.rs:188-203` - delete_skill_directory for reference
  - `src-tauri/src/lib.rs:20-40` - Command registration

  **Acceptance Criteria**:

  ```
  Scenario: Rust compiles
    Tool: Bash
    Steps:
      1. cd src-tauri && cargo check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: Copy commands exist
    Tool: Bash
    Steps:
      1. grep -c "copy_skill\|symlink_skill" src-tauri/src/commands/skills.rs
    Expected Result: At least 2 matches
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(skills): add copy_skill and symlink_skill commands`
  - Files: `src-tauri/src/commands/skills.rs`, `src-tauri/src/lib.rs`
  - Pre-commit: `cargo check`

---

- [ ] 10. Add copy actions to SkillCard and ProjectPanel

  **What to do**:
  - Modify `src/components/skills/SkillDetailDialog.tsx`
  - Add "Copy to Project" button (opens folder picker, copies skill)
  
  - Modify `src/components/project/ProjectPanel.tsx`
  - Add dropdown menu on each project skill card
  - Add "Copy to Global" action
  - Add "Create Symlink to Global" action
  
  - Show success/error toast after copy

  **Must NOT do**:
  - DO NOT auto-refresh after copy (let user trigger)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **References**:
  - `src/components/skills/SkillDetailDialog.tsx` - Global skill actions
  - `src/components/project/ProjectPanel.tsx:141-161` - Project skill card

  **Acceptance Criteria**:

  ```
  Scenario: TypeScript compiles
    Tool: Bash
    Steps:
      1. pnpm check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: Copy actions exist
    Tool: Bash
    Steps:
      1. grep -c "copy_skill\|Copy to" src/components/skills/SkillDetailDialog.tsx src/components/project/ProjectPanel.tsx
    Expected Result: At least 2 matches
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `feat(ui): add copy skill actions to Global and Project panels`
  - Files: `src/components/skills/SkillDetailDialog.tsx`, `src/components/project/ProjectPanel.tsx`
  - Pre-commit: `pnpm check`

---

### Documentation Update

---

- [ ] 11. Update documentation

  **What to do**:
  - Modify `README.md`
    - Update Features section with 40+ agent support, token auth, multi-project, copy skills
    - Update Usage section with new features
  
  - Modify `DESIGN.md`
    - Update data models (AgentConfig, AppSettings)
    - Add Feature 1-4 specifications
  
  - Modify `AGENTS.md`
    - Update agent list section
    - Add new Tauri commands

  **Must NOT do**:
  - DO NOT remove existing valid content

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **References**:
  - `README.md` - Features, Usage sections
  - `DESIGN.md` - Data Models, Feature Specifications
  - `AGENTS.md` - Key Directories, Tauri commands

  **Acceptance Criteria**:

  ```
  Scenario: Documentation updated
    Tool: Bash
    Steps:
      1. grep -c "40" README.md DESIGN.md
    Expected Result: At least 1 match per file
    Evidence: Grep output
  ```

  **Commit**: YES
  - Message: `docs: update documentation for 4 new features`
  - Files: `README.md`, `DESIGN.md`, `AGENTS.md`
  - Pre-commit: None

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(settings): expand agent support to 40 agents with project paths` | settings.rs | cargo check |
| 2 | `feat(settings): add scrollable UI for 40 agents with search filter` | SettingsDialog.tsx | pnpm check |
| 3 | `feat(settings): add GitHub token storage` | settings.rs, lib.rs | cargo check |
| 4 | `feat(sync): add GitHub token input UI` | SyncPanel.tsx | pnpm check |
| 5 | `feat(sync): use GitHub token in git operations for passwordless auth` | sync.rs | cargo check |
| 6 | `feat(settings): add project persistence fields` | settings.rs | cargo check |
| 7 | `feat(project): add multi-project tabs UI with recent projects dropdown` | ProjectPanel.tsx | pnpm check |
| 8 | `feat(app): persist open projects across tab switches and restarts` | App.tsx, ProjectPanel.tsx | pnpm check |
| 9 | `feat(skills): add copy_skill and symlink_skill commands` | skills.rs, lib.rs | cargo check |
| 10 | `feat(ui): add copy skill actions to Global and Project panels` | SkillDetailDialog.tsx, ProjectPanel.tsx | pnpm check |
| 11 | `docs: update documentation for 4 new features` | README.md, DESIGN.md, AGENTS.md | N/A |

---

## Success Criteria

### Verification Commands

```bash
# All checks pass
pnpm check:all
# Expected: Exit code 0

# 40 agents in settings
grep -c "id:" src/components/settings/SettingsDialog.tsx
# Expected: >= 40

# Token support exists
grep "github_token" src-tauri/src/commands/settings.rs
grep "githubToken" src/components/sync/SyncPanel.tsx
# Expected: Matches found

# Multi-project support
grep "active_projects" src-tauri/src/commands/settings.rs
grep "projects" src/components/project/ProjectPanel.tsx
# Expected: Matches found

# Copy skill commands
grep "copy_skill" src-tauri/src/commands/skills.rs
# Expected: Matches found
```

### Final Checklist
- [ ] 40 agents visible in Settings dialog with scrollable list
- [ ] GitHub token input in Sync tab, persisted
- [ ] Git clone/pull/push work without username/password prompts when token set
- [ ] Multiple projects can be opened as tabs
- [ ] Projects persist when switching tabs and restarting app
- [ ] Skills can be copied from Global to Project and vice versa
- [ ] All type checks pass (pnpm check:all)
- [ ] Documentation updated
