# Add Agent Installation Mode Selection

## TL;DR

> **Quick Summary**: Add UI to ImportSkillDialog to let users choose between installing to all agents or just central skill directory.
> 
> **Deliverables**:
> - Update `ImportSkillDialog.tsx` with RadioGroup/Select for install mode
> - Update `skills.rs` to handle install mode parameter
> - Pass correct flags to `npx skills add` command
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - sequential
> **Critical Path**: Backend API → Frontend UI

---

## Context

### Original Request
User wants to choose whether to install a skill for ALL agents or just in the central `~/.agents/skills/` directory when adding a new skill.

### Current State
- `run_skills_add` currently hardcodes `["skills", "add", "-g", "-y"]`
- This installs globally (`-g`) and skips prompts (`-y`)
- But it doesn't specify agents, so `skills` CLI might default to interactive or specific behavior depending on version
- User wants explicit control

### Technical Details
- `npx skills add -g -y` -> Installs to central repo, prompts for agents (interactive) or installs to default? 
  - Actually with `-y` it might install to ALL or NONE depending on CLI defaults.
- `npx skills add -g -y --all` -> Installs to central AND symlinks to all agents
- `npx skills add -g -y` (no agent flags) -> Should just be central

---

## Work Objectives

### Core Objective
Enable user control over skill installation scope (Central Only vs All Agents).

### Concrete Deliverables
- Backend command `run_skills_add` accepts `install_mode: "central" | "all"`
- Frontend dialog has UI to select this mode
- Command execution uses correct flags

### Definition of Done
- [ ] `pnpm check` passes
- [ ] `pnpm check:rust` passes
- [ ] UI shows selection options
- [ ] "All Agents" passes `--all` flag
- [ ] "Central Only" passes no agent flags (just `-g -y`)

---

## TODOs

- [x] 1. Update backend command signature
  
  **What to do**:
  - Modify `run_skills_add` in `src-tauri/src/commands/skills.rs`
  - Add `install_mode: String` parameter
  - Logic:
    - If `install_mode == "all"` -> Add `--all` flag
    - If `install_mode == "central"` -> Do NOT add agent flags (just `-g -y`)
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `["rust"]`

  **Acceptance Criteria**:
  - [ ] Compiles successfully
  - [ ] Handles both modes correctly

- [x] 2. Update frontend UI
  
  **What to do**:
  - Edit `src/components/skills/ImportSkillDialog.tsx`
  - Add `RadioGroup` for "Install Scope":
    - Option 1: "Central Storage Only" (default)
    - Option 2: "Install for All Agents"
  - Pass `installMode` to `invoke("run_skills_add", ...)`
  
  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `["ui-ux-pro-max"]`

  **Acceptance Criteria**:
  - [x] UI looks clean and consistent
  - [x] Selection state works
  - [x] Correct parameter passed to backend

- [x] 3. Verify implementation
  
  **What to do**:
  - Run type checks
  - Verify Rust compilation
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
  
  **Acceptance Criteria**:
  - [ ] `pnpm check` passes
  - [ ] `pnpm check:rust` passes

---

## Success Criteria

### Verification Commands
```bash
pnpm check
pnpm check:rust
```
