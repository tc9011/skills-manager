# Remove Discover Tab & Fix Sync Functionality

## TL;DR

> **Quick Summary**: Remove the unused Discover tab from the app and fix the Sync functionality which is currently non-functional due to a design gap (existing skills folder without git initialization).
> 
> **Deliverables**:
> - Discover tab completely removed from UI and codebase
> - Sync functionality working for all scenarios (new repo, existing folder, connected repo)
> - Updated documentation (README, DESIGN.md, AGENTS.md)
> 
> **Estimated Effort**: Medium (3-4 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 5 (documentation after code changes)

---

## Context

### Original Request
User requested:
1. 去掉 Discover tab
2. Sync 功能没有生效 (Pull/Push 失败, 状态不更新, 完全无反应)

### Interview Summary
**Key Discussions**:
- Discover tab should be completely removed (not replaced)
- Sync has multiple issues: Pull/Push fails, status doesn't update, buttons have no response
- `~/.agents/skills/` may or may not be a git repository - need to handle both cases

**Research Findings**:
- Current sync implementation assumes "clone from scratch" workflow
- **ROOT CAUSE**: When `~/.agents/skills/` exists but isn't a git repo, clone fails with "directory exists" and there's no alternative path
- `git_init_repo` command exists in Rust but is never called from frontend
- Need to add UI flow for "existing folder, not a repo" scenario

### Metis Review
**Identified Gaps** (addressed):
- Missing "Initialize Repository" UI flow for existing folders
- `git_init_repo` command exists but not wired to frontend
- Error messages not specific enough for debugging
- First push needs `-u origin <branch>` flag

---

## Work Objectives

### Core Objective
Remove the Discover tab and fix the Sync functionality to work in all scenarios: no folder, folder exists without git, and folder is already a git repo.

### Concrete Deliverables
- `src/components/discover/DiscoverPanel.tsx` deleted
- `src/App.tsx` updated (remove Discover tab)
- `src/components/sync/SyncPanel.tsx` updated (add Initialize Repository flow)
- Documentation updated (README.md, DESIGN.md, AGENTS.md)

### Definition of Done
- [ ] `pnpm check:all` passes with exit code 0
- [ ] App starts with 3 tabs: Global, Project, Sync
- [ ] Sync shows "Initialize Repository" option when folder exists but no git
- [ ] Sync Pull/Push work when connected to a git repo

### Must Have
- Remove Discover tab completely
- Fix Sync for "existing folder, no git" scenario
- All type checks pass

### Must NOT Have (Guardrails)
- **DO NOT** remove `run_skills_add` Tauri command (used by AddSkillDialog)
- **DO NOT** auto-delete or overwrite existing `~/.agents/skills/` contents
- **DO NOT** implement auto-sync, conflict resolution, or multiple remotes
- **DO NOT** change git authentication mechanisms (use system git)

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (TypeScript check, Cargo check)
- **Automated tests**: Tests-after (verification commands)
- **Framework**: pnpm check:all, cargo check

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Compilation** | Bash (pnpm/cargo) | Run check commands, assert exit 0 |
| **File removal** | Bash (test) | Verify file doesn't exist |
| **Frontend/UI** | Playwright | Navigate, click tabs, assert DOM |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Remove Discover Tab (frontend)
└── Task 2: Add Initialize Repository flow to SyncPanel

Wave 2 (After Wave 1):
├── Task 3: Fix git push to use -u flag for first push
└── Task 4: Add better error handling/logging

Wave 3 (After Wave 2):
└── Task 5: Update documentation (README, DESIGN.md, AGENTS.md)
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 5 | 2 |
| 2 | None | 3, 4 | 1 |
| 3 | 2 | 5 | 4 |
| 4 | 2 | 5 | 3 |
| 5 | 1, 3, 4 | None | None (final) |

---

## TODOs

- [ ] 1. Remove Discover Tab from App

  **What to do**:
  - Delete file `src/components/discover/DiscoverPanel.tsx`
  - Edit `src/App.tsx`:
    - Remove import: `import { DiscoverPanel } from "@/components/discover/DiscoverPanel";`
    - Remove `Download` from lucide-react import
    - Remove the Discover TabsTrigger (lines 77-80)
    - Remove the Discover TabsContent (lines 103-105)
  - Delete the empty directory `src/components/discover/` if no other files

  **Must NOT do**:
  - DO NOT touch any Tauri commands
  - DO NOT remove other lucide-react icons

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple deletion and import removal task
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Understands React component structure

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `src/App.tsx:11` - DiscoverPanel import to remove
  - `src/App.tsx:17` - Download icon import to remove
  - `src/App.tsx:77-80` - Discover TabsTrigger to remove
  - `src/App.tsx:103-105` - Discover TabsContent to remove

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Discover file deleted
    Tool: Bash
    Steps:
      1. test ! -f src/components/discover/DiscoverPanel.tsx
    Expected Result: Exit code 0 (file doesn't exist)
    Evidence: Command output

  Scenario: TypeScript compiles without errors
    Tool: Bash
    Steps:
      1. pnpm check
    Expected Result: Exit code 0, no errors in output
    Evidence: Command output

  Scenario: App has 3 tabs (no Discover)
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:1420
    Steps:
      1. Navigate to: http://localhost:1420
      2. Wait for: [role="tablist"] visible (timeout: 10s)
      3. Query: [role="tab"] → count elements
      4. Assert: count equals 3
      5. Assert: text "Discover" NOT present in [role="tablist"]
      6. Screenshot: .sisyphus/evidence/task-1-no-discover-tab.png
    Expected Result: Only 3 tabs visible (Global, Project, Sync)
    Evidence: .sisyphus/evidence/task-1-no-discover-tab.png
  ```

  **Commit**: YES
  - Message: `refactor(ui): remove Discover tab from navigation`
  - Files: `src/App.tsx`, `src/components/discover/` (deleted)
  - Pre-commit: `pnpm check`

---

- [ ] 2. Add Initialize Repository Flow to SyncPanel

  **What to do**:
  - Modify `src/components/sync/SyncPanel.tsx`:
    - Add new state: `hasExistingFolder` (boolean)
    - In `loadStatus()`, check if `~/.agents/skills/` exists (new Tauri command needed)
    - When folder exists but no git: Show "Initialize Repository" UI instead of "Clone Repository"
    - Add new button "Initialize Repository" that calls `git_init_repo`
    - After init success, update status to show "Connected"
  - Add new Tauri command `check_skills_folder_exists` in `src-tauri/src/commands/sync.rs`
  - Register new command in `src-tauri/src/lib.rs`

  **Must NOT do**:
  - DO NOT auto-delete existing folder
  - DO NOT change clone behavior

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires both frontend and Rust backend changes
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: React component modifications

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: None

  **References**:
  - `src/components/sync/SyncPanel.tsx:49-68` - loadStatus function to modify
  - `src/components/sync/SyncPanel.tsx:217-263` - Setup UI to add alternative flow
  - `src-tauri/src/commands/sync.rs:91-115` - git_init_repo command (already exists, need to wire up)
  - `src-tauri/src/lib.rs:20-39` - Command registration

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Rust compiles with new command
    Tool: Bash
    Steps:
      1. cd src-tauri && cargo check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: Initialize Repository button appears for existing folder
    Tool: Playwright (playwright skill)
    Preconditions: 
      - ~/.agents/skills/ exists with files but no .git
      - Dev server running on localhost:1420
    Steps:
      1. Navigate to: http://localhost:1420
      2. Click: [role="tab"]:has-text("Sync")
      3. Wait for: Card content visible (timeout: 5s)
      4. Assert: Button with text "Initialize Repository" OR "Clone Repository" visible
      5. Screenshot: .sisyphus/evidence/task-2-sync-init-ui.png
    Expected Result: Appropriate button shown based on folder state
    Evidence: .sisyphus/evidence/task-2-sync-init-ui.png

  Scenario: Initialize Repository actually works
    Tool: Bash + Playwright
    Preconditions: 
      - ~/.agents/skills/ exists without .git
      - Valid repo URL available
    Steps:
      1. (Setup) Ensure no .git in ~/.agents/skills/
      2. Navigate to Sync tab
      3. Enter repo URL in input
      4. Click "Initialize Repository"
      5. Wait for success message (timeout: 30s)
      6. Assert: ~/.agents/skills/.git exists
    Expected Result: Folder initialized as git repo with remote
    Evidence: Command output + screenshot
  ```

  **Commit**: YES
  - Message: `feat(sync): add Initialize Repository flow for existing folders`
  - Files: `src/components/sync/SyncPanel.tsx`, `src-tauri/src/commands/sync.rs`, `src-tauri/src/lib.rs`
  - Pre-commit: `pnpm check:all`

---

- [ ] 3. Fix Git Push to Use -u Flag for First Push

  **What to do**:
  - Modify `src-tauri/src/commands/sync.rs`:
    - In `git_add_commit_push`, check if upstream is set before pushing
    - If no upstream, use `git push -u origin <branch>` instead of plain `git push`
    - Get current branch from config or detect from git

  **Must NOT do**:
  - DO NOT change push behavior for repos that already have upstream set

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small Rust modification
  - **Skills**: []
    - No special skills needed for simple Rust fix

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 2

  **References**:
  - `src-tauri/src/commands/sync.rs:170-190` - git_add_commit_push function
  - `src-tauri/src/commands/sync.rs:57-75` - run_git_command helper

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Rust compiles after push fix
    Tool: Bash
    Steps:
      1. cd src-tauri && cargo check
    Expected Result: Exit code 0
    Evidence: Command output

  Scenario: First push uses -u flag
    Tool: Bash (code review)
    Steps:
      1. grep -n "push.*-u" src-tauri/src/commands/sync.rs
    Expected Result: Line found with push -u origin logic
    Evidence: Grep output showing the pattern
  ```

  **Commit**: YES (group with Task 4)
  - Message: `fix(sync): use -u flag for first git push`
  - Files: `src-tauri/src/commands/sync.rs`
  - Pre-commit: `pnpm check:rust`

---

- [ ] 4. Add Better Error Handling and Logging

  **What to do**:
  - Modify `src-tauri/src/commands/sync.rs`:
    - Add `eprintln!` logging for all git commands (debug in dev)
    - Include git command arguments in error messages
    - Return more specific error messages (not just stderr)
  - Modify `src/components/sync/SyncPanel.tsx`:
    - Add `console.log` for invoke calls and responses
    - Show full error message in UI result card

  **Must NOT do**:
  - DO NOT log sensitive info (auth tokens, passwords)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding logging statements
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 5
  - **Blocked By**: Task 2

  **References**:
  - `src-tauri/src/commands/sync.rs:57-75` - run_git_command to add logging
  - `src/components/sync/SyncPanel.tsx:74-107` - handleSetupRepo to add console.log

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Rust has logging for git commands
    Tool: Bash
    Steps:
      1. grep -n "eprintln\!" src-tauri/src/commands/sync.rs | wc -l
    Expected Result: At least 3 logging statements added
    Evidence: Grep count output

  Scenario: Frontend logs invoke calls
    Tool: Bash
    Steps:
      1. grep -n "console.log" src/components/sync/SyncPanel.tsx | wc -l
    Expected Result: At least 2 console.log statements for debugging
    Evidence: Grep count output
  ```

  **Commit**: YES (group with Task 3)
  - Message: `fix(sync): add logging for git operations debugging`
  - Files: `src-tauri/src/commands/sync.rs`, `src/components/sync/SyncPanel.tsx`
  - Pre-commit: `pnpm check:all`

---

- [ ] 5. Update Documentation

  **What to do**:
  - Edit `README.md`:
    - Remove Discover section from Features list
    - Remove Discover from Usage section
    - Update screenshot description (if referenced)
  - Edit `DESIGN.md`:
    - Remove "### 3. Discover Tab" section entirely
    - Update architecture diagram if it shows Discover
    - Update Phase 1 checklist to remove Discover item
    - Update File Manifest to remove discover/ directory
  - Edit `AGENTS.md`:
    - Remove discover/ from Key Directories
    - Remove any Discover references in Component Diagram

  **Must NOT do**:
  - DO NOT remove unrelated content

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation updates
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 3, 4

  **References**:
  - `README.md:15-16` - Features list with Discover
  - `README.md:42-45` - Discover Skills usage section
  - `DESIGN.md:209-225` - Discover Tab specification section
  - `DESIGN.md:333-339` - Phase 1 checklist with Discover
  - `AGENTS.md:91` - discover/ in component diagram

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: README has no Discover references
    Tool: Bash
    Steps:
      1. grep -i "discover" README.md | wc -l
    Expected Result: 0 matches
    Evidence: Grep count = 0

  Scenario: DESIGN.md has no Discover Tab section
    Tool: Bash
    Steps:
      1. grep -n "### 3. Discover Tab" DESIGN.md
    Expected Result: Exit code 1 (no match)
    Evidence: No output from grep

  Scenario: AGENTS.md has no discover directory reference
    Tool: Bash
    Steps:
      1. grep -n "discover/" AGENTS.md
    Expected Result: Exit code 1 (no match)
    Evidence: No output from grep
  ```

  **Commit**: YES
  - Message: `docs: remove Discover tab references from documentation`
  - Files: `README.md`, `DESIGN.md`, `AGENTS.md`
  - Pre-commit: None (docs only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `refactor(ui): remove Discover tab from navigation` | App.tsx, discover/ | pnpm check |
| 2 | `feat(sync): add Initialize Repository flow for existing folders` | SyncPanel.tsx, sync.rs, lib.rs | pnpm check:all |
| 3+4 | `fix(sync): improve git push handling and add logging` | sync.rs, SyncPanel.tsx | pnpm check:all |
| 5 | `docs: remove Discover tab references from documentation` | README.md, DESIGN.md, AGENTS.md | N/A |

---

## Success Criteria

### Verification Commands
```bash
# All type checks pass
pnpm check:all
# Expected: Exit code 0

# Discover file deleted
test ! -f src/components/discover/DiscoverPanel.tsx && echo "PASS"
# Expected: PASS

# No Discover references in docs
grep -ri "discover" README.md DESIGN.md AGENTS.md | grep -v ".git" | wc -l
# Expected: 0

# Sync commands registered
grep -c "git_init_repo\|check_skills_folder_exists" src-tauri/src/lib.rs
# Expected: At least 1 match for git_init_repo
```

### Final Checklist
- [ ] Discover tab removed from UI (3 tabs only)
- [ ] TypeScript and Rust compile without errors
- [ ] Sync works for existing folder without git (Initialize Repository flow)
- [ ] Sync works for connected git repos (Pull/Push)
- [ ] All documentation updated
