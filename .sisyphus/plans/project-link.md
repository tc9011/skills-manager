# Project-Level Link: `link --project` with Copy/Symlink Mode

## TL;DR

> **Quick Summary**: Add `--project` flag to the existing `link` command so users can link (or copy) skills into the current project directory using each agent's `projectPath`, enabling project-scoped skill management.
> 
> **Deliverables**:
> - `link --project` flag with interactive copy/symlink mode selection (default: copy)
> - `copySkills()` function in linker.ts alongside existing `createSkillSymlinks()`
> - `getAgentProjectPath()` in agents.ts to resolve projectPath relative to CWD
> - Deduplication of shared projectPaths (10 universal agents → `.agents/skills`)
> - Full test coverage for all new code paths
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7

---

## Context

### Original Request
User wants `link --project` to create symlinks or copies of skills in project-level agent directories (relative to CWD) instead of global paths like `~/.cursor/skills`.

### Interview Summary
**Key Discussions**:
- `--project` flag on existing `link` command (not a new command)
- Interactive prompt for copy vs symlink mode each time, with copy as default
- Users still select agents via multiselect (same UX as global link)
- Each agent uses its own `projectPath` from the registry (e.g., `.claude/skills`, `.agents/skills`)

**Research Findings**:
- `agentRegistry` already has `projectPath` field for all 41 agents — defined but never used
- 10 universal agents share `projectPath: '.agents/skills'` — needs deduplication to avoid redundant work
- Current `createSkillSymlinks()` uses relative paths; project symlinks should use **absolute paths** since source (CWD) and target (`~/.agents/skills`) are in unrelated trees

### Metis Review
**Identified Gaps** (addressed):
- **Absolute vs relative symlinks**: Project symlinks cross from `./project/` to `~/.agents/skills/` — relative paths break if either moves. Using absolute paths for project-mode symlinks.
- **Universal agent deduplication**: 10 agents share `.agents/skills` projectPath. Selecting multiple universal agents should only create one set of links/copies, not duplicate.
- **Copy re-run behavior**: Specify overwrite semantics — re-running copy mode overwrites existing files to stay in sync.

---

## Work Objectives

### Core Objective
Enable `skills-manager link --project` to create project-scoped skill links or copies using each agent's `projectPath`, so developers can have per-project skill configurations.

### Concrete Deliverables
- `src/agents.ts`: Export `getAgentProjectPath(agentId, projectRoot)` function
- `src/linker.ts`: Export `copySkills()` function with `CopyResult` type; update `createSkillSymlinks()` to support absolute-path mode
- `src/commands/link.ts`: Add `--project` flag handling, copy/symlink mode prompt, projectPath deduplication
- `src/index.ts`: Add `--project` option to Commander link command
- Tests for all new functions and behaviors

### Definition of Done
- [ ] `skills-manager link --project` creates skills in `$CWD/<projectPath>/` for each selected agent
- [ ] User is prompted to choose copy or symlink (default: copy)
- [ ] Universal agents sharing the same projectPath are deduplicated
- [ ] All existing tests still pass
- [ ] New tests cover: copySkills, getAgentProjectPath, project-mode link flow, deduplication

### Must Have
- `--project` flag on `link` command
- Interactive copy/symlink choice (default: copy)
- Per-agent projectPath resolution
- Deduplication of shared projectPaths
- Absolute paths for project-mode symlinks

### Must NOT Have (Guardrails)
- Do NOT change global link behavior (no regressions)
- Do NOT modify `.skill-lock.json`
- Do NOT auto-detect project vs global — user must explicitly pass `--project`
- Do NOT add a `--path <dir>` flag (not requested)
- Do NOT over-abstract — keep copy and symlink as simple parallel functions

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: TDD (tests first)
- **Framework**: vitest

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Library/Module**: Use Bash (bun/vitest) — run test suites, compare output
- **CLI**: Use Bash — run `npx tsx src/index.ts link --project` in a temp directory

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
├── Task 1: getAgentProjectPath() in agents.ts + tests [quick]
├── Task 2: copySkills() in linker.ts + tests [quick]

Wave 2 (After Wave 1 — integration):
├── Task 3: createProjectSymlinks() absolute-path variant in linker.ts + tests [quick]
├── Task 4: Deduplication utility for shared projectPaths [quick]

Wave 3 (After Wave 2 — command wiring):
├── Task 5: link command --project flag + copy/symlink prompt + dedup [unspecified-high]
├── Task 6: Commander option wiring in index.ts [quick]

Wave 4 (After Wave 3 — verification):
├── Task 7: Integration verification — all tests pass + manual CLI test [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real QA — run link --project in temp dir (unspecified-high)
├── Task F4: Scope fidelity check (deep)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 3, 4, 5 | 1 |
| 2 | — | 5 | 1 |
| 3 | 1 | 5 | 2 |
| 4 | 1 | 5 | 2 |
| 5 | 2, 3, 4 | 6, 7 | 3 |
| 6 | 5 | 7 | 3 |
| 7 | 5, 6 | F1-F4 | 4 |

### Agent Dispatch Summary

- **Wave 1**: **2 parallel** — T1 → `quick`, T2 → `quick`
- **Wave 2**: **2 parallel** — T3 → `quick`, T4 → `quick`
- **Wave 3**: **2 sequential** — T5 → `unspecified-high`, T6 → `quick`
- **Wave 4**: **1** — T7 → `quick`
- **FINAL**: **4 parallel** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + `npm run lint` + `npm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Create a temp project directory. Run `npx tsx src/index.ts link --project` from it. Verify: (1) copy/symlink prompt appears with copy as default, (2) agent multiselect works, (3) skills appear in correct projectPath dirs, (4) re-run overwrites copies / reports existing symlinks, (5) global link still works unchanged.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Order | Commit Message | Files |
|-------|---------------|-------|
| 1 | `feat: add project-level link with copy/symlink mode` | agents.ts, linker.ts, commands/link.ts, index.ts, *.test.ts |

Single commit since all changes are part of one feature.

---

## Success Criteria

### Verification Commands
```bash
npm test                    # Expected: all tests pass (119 existing + ~15 new)
npx tsc --noEmit           # Expected: no type errors
npm run lint               # Expected: no lint errors
```

### Final Checklist
- [ ] `link --project` creates skills in `$CWD/<projectPath>/` for selected agents
- [ ] Copy mode copies actual files; symlink mode creates absolute symlinks
- [ ] Universal agents deduplicated (10 agents → 1 directory operation)
- [ ] Existing global `link` behavior unchanged (no regressions)
- [ ] All "Must NOT Have" items absent
- [ ] All tests pass
