# UI Redesign: Skills Hub Layout

## TL;DR

> **Quick Summary**: Complete UI redesign from dark theme to light theme with sidebar navigation, terminal-style skill cards, and warm terracotta accent colors based on the provided design mockup.
> 
> **Deliverables**:
> - New light color theme in `src/index.css`
> - New `Sidebar.tsx` component with navigation sections
> - Redesigned `SkillCard.tsx` with terminal-style header
> - Refactored `App.tsx` with sidebar + main content layout
> - Updated button styles and header layout
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Theme → Sidebar → SkillCard → App.tsx

---

## Context

### Original Request
User provided a design mockup image showing a complete UI redesign with:
- Left sidebar navigation (GENERAL, AGENTS, PROJECTS sections)
- Light/warm color scheme with terracotta accents
- Terminal-style skill cards with red/yellow/green dots
- New header with "Create Skill" and "Import Skill" buttons
- Skills count display

### Design Analysis

**Layout Structure:**
1. **Left Sidebar** (~250px width):
   - Logo: "Skills Hub" with cube icon
   - GENERAL section: Introduction, All Skills, Central Hub
   - AGENTS section: List of agents with settings icon
   - PROJECTS section: List of projects with settings/add icons

2. **Main Content Area**:
   - Header: Title + action buttons + skills count
   - Skills grid: 3-column layout with terminal-style cards

**Color Palette:**
- Background: Warm off-white `hsl(30 20% 98%)`
- Sidebar: Slightly darker `hsl(30 15% 97%)`
- Primary accent: Terracotta `hsl(18 65% 52%)` (~#C4704B)
- Text: Dark brown/gray `hsl(20 10% 20%)`
- Cards: Pure white with subtle shadow
- Active state: Light warm gray `hsl(30 20% 94%)`

**Skill Card Design:**
- Terminal header: 3 colored dots (red/yellow/green) + skill name
- Title in terracotta color
- Agent badges (Hub badge is terracotta, others are outlined)
- Description with "//" prefix in terracotta
- Bottom: Dark "Sync" button + trash icon

---

## Work Objectives

### Core Objective
Transform the current dark-themed tab-based UI into a light-themed sidebar-based layout matching the provided design mockup.

### Concrete Deliverables
- `src/index.css` - Updated with light theme colors
- `src/components/layout/Sidebar.tsx` - New sidebar navigation component
- `src/components/skills/SkillCard.tsx` - Redesigned terminal-style card
- `src/App.tsx` - New layout with sidebar + main content

### Definition of Done
- [x] App displays with light theme and sidebar navigation
- [x] Skill cards match the terminal-style design
- [x] `pnpm check` passes with no TypeScript errors
- [x] `pnpm dev:tauri` runs without errors

### Must Have
- Light color theme with terracotta accents
- Sidebar with GENERAL, AGENTS, PROJECTS sections
- Terminal-style skill cards with colored dots
- "Create Skill" and "Import Skill" buttons in header
- Skills count display

### Must NOT Have (Guardrails)
- DO NOT change Rust backend code
- DO NOT modify Tauri commands or capabilities
- DO NOT break existing functionality
- DO NOT use purple gradients or generic styling

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (Tauri app, no unit tests)
- **Automated tests**: None
- **Framework**: N/A

### Agent-Executed QA Scenarios (MANDATORY)

```
Scenario: App displays with new light theme
  Tool: Bash (dev server verification)
  Preconditions: Dependencies installed
  Steps:
    1. Run: pnpm check
    2. Assert: No TypeScript errors
    3. Run: pnpm dev (frontend only)
    4. Assert: Vite starts successfully
  Expected Result: Build passes, dev server starts
  Evidence: Terminal output captured

Scenario: Visual verification of new layout
  Tool: Manual verification via pnpm dev:tauri
  Steps:
    1. Start app with pnpm dev:tauri
    2. Observe sidebar on left side
    3. Observe skill cards in main area
    4. Verify terracotta accent colors
  Expected Result: UI matches design mockup
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Update color theme (index.css)
└── Task 2: Create Sidebar component

Wave 2 (After Wave 1):
├── Task 3: Redesign SkillCard
└── Task 4: Refactor App.tsx layout

Wave 3 (After Wave 2):
└── Task 5: Final styling adjustments and verification

Critical Path: Task 1 → Task 4 → Task 5
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4 | 2 |
| 2 | None | 4 | 1 |
| 3 | 1 | 5 | 4 |
| 4 | 1, 2 | 5 | 3 |
| 5 | 3, 4 | None | None (final) |

---

## TODOs

- [x] 1. Update Color Theme (index.css)

  **What to do**:
  - Replace dark theme with light theme colors
  - Add terracotta accent color variables
  - Add sidebar-specific color variables
  - Update border radius to 0.75rem

  **Must NOT do**:
  - Change Tailwind import structure
  - Remove existing CSS layer

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: None

  **References**:
  - `src/index.css` - Current theme file to modify
  - Design colors: Background `hsl(30 20% 98%)`, Primary `hsl(18 65% 52%)`

  **Acceptance Criteria**:
  - [x] `--color-background` is light warm white
  - [x] `--color-primary` is terracotta
  - [x] `--color-sidebar` and related variables exist
  - [x] `pnpm check` passes

  **Commit**: YES
  - Message: `style(theme): switch from dark to light theme with terracotta accents`
  - Files: `src/index.css`

---

- [x] 2. Create Sidebar Component

  **What to do**:
  - Create `src/components/layout/Sidebar.tsx`
  - Implement three sections: GENERAL, AGENTS, PROJECTS
  - Add navigation items with icons
  - Handle active state styling
  - Accept props for agents list and projects list

  **Must NOT do**:
  - Hard-code agent or project lists (receive via props)
  - Add routing (just visual for now)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:
  - Design shows: Skills Hub logo, GENERAL (Introduction, All Skills, Central Hub), AGENTS (with settings icon), PROJECTS (with settings/+ icons)
  - `src/components/ui/button.tsx` - Existing button component
  - `lucide-react` icons: Box, FileText, Layers, Settings, Plus, FolderOpen

  **Acceptance Criteria**:
  - [x] Sidebar component renders with 3 sections
  - [x] Active item has highlighted background
  - [x] AGENTS section shows list of enabled agents
  - [x] PROJECTS section shows list of open projects
  - [x] TypeScript types are correct

  **Commit**: YES
  - Message: `feat(layout): add Sidebar component with navigation sections`
  - Files: `src/components/layout/Sidebar.tsx`

---

- [x] 3. Redesign SkillCard Component

  **What to do**:
  - Add terminal-style header with red/yellow/green dots
  - Skill name in header (smaller, muted)
  - Title in terracotta color below header
  - Agent badges with Hub badge highlighted
  - Description with "//" prefix
  - Bottom section with "Sync" button and delete icon

  **Must NOT do**:
  - Change the Skill type interface
  - Remove onClick functionality

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:
  - `src/components/skills/SkillCard.tsx` - Current implementation
  - `src/types/skill.ts` - Skill type definition
  - Design: Terminal dots colors are `#EF6B5E` (red), `#F5BD4F` (yellow), `#61C454` (green)

  **Acceptance Criteria**:
  - [x] Card has terminal-style header with 3 colored dots
  - [x] Skill name appears in header area
  - [x] Title is terracotta colored
  - [x] Badges show Hub (terracotta) and agent names
  - [x] Description has "//" prefix
  - [x] Sync button and trash icon at bottom
  - [x] Hover state works correctly

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: SkillCard renders with terminal style
    Tool: Bash (TypeScript check)
    Steps:
      1. Run: pnpm check
      2. Assert: No errors in SkillCard.tsx
    Expected Result: Component compiles
    Evidence: Terminal output
  ```

  **Commit**: YES
  - Message: `style(skills): redesign SkillCard with terminal-style header`
  - Files: `src/components/skills/SkillCard.tsx`

---

- [x] 4. Refactor App.tsx Layout

  **What to do**:
  - Replace tab-based layout with sidebar + main content
  - Import and use new Sidebar component
  - Pass agents and projects to Sidebar
  - Create main content area with header
  - Add "Create Skill" (outlined) and "Import Skill" (orange filled) buttons
  - Add skills count display
  - Keep existing dialogs and functionality

  **Must NOT do**:
  - Remove existing functionality (add skill, view detail, etc.)
  - Change how skills are fetched
  - Remove Settings functionality

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `src/App.tsx` - Current layout to refactor
  - `src/components/layout/Sidebar.tsx` - New sidebar component (Task 2)
  - `src/components/settings/SettingsPanel.tsx` - Settings to integrate

  **Acceptance Criteria**:
  - [x] Sidebar displays on left side
  - [x] Main content fills remaining width
  - [x] Header shows "Skills Manager" title
  - [x] "Create Skill" and "Import Skill" buttons in header
  - [x] Skills count shows "X skills found"
  - [x] Existing dialogs still work
  - [x] `pnpm check` passes

  **Commit**: YES
  - Message: `refactor(app): implement sidebar layout replacing tabs`
  - Files: `src/App.tsx`

---

- [x] 5. Final Styling Adjustments

  **What to do**:
  - Verify all colors match design
  - Adjust spacing and padding as needed
  - Ensure responsive behavior
  - Fix any visual inconsistencies
  - Run final TypeScript check

  **Must NOT do**:
  - Make major structural changes
  - Break existing functionality

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 3, 4

  **References**:
  - All modified files from previous tasks
  - Original design mockup

  **Acceptance Criteria**:
  - [x] `pnpm check` passes
  - [x] No console errors in dev mode
  - [x] Visual appearance matches design mockup
  - [x] All existing functionality works

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Full build verification
    Tool: Bash
    Steps:
      1. Run: pnpm check
      2. Assert: Exit code 0
      3. Run: pnpm dev (verify starts)
      4. Assert: Vite starts on localhost
    Expected Result: Build passes, dev server runs
    Evidence: Terminal output showing success
  ```

  **Commit**: YES
  - Message: `style(ui): final styling adjustments for Skills Hub redesign`
  - Files: Any files adjusted

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `style(theme): switch from dark to light theme with terracotta accents` | src/index.css | pnpm check |
| 2 | `feat(layout): add Sidebar component with navigation sections` | src/components/layout/Sidebar.tsx | pnpm check |
| 3 | `style(skills): redesign SkillCard with terminal-style header` | src/components/skills/SkillCard.tsx | pnpm check |
| 4 | `refactor(app): implement sidebar layout replacing tabs` | src/App.tsx | pnpm check |
| 5 | `style(ui): final styling adjustments for Skills Hub redesign` | various | pnpm check |

---

## Success Criteria

### Verification Commands
```bash
pnpm check          # Expected: No TypeScript errors
pnpm dev            # Expected: Vite starts successfully
```

### Final Checklist
- [x] Light theme with terracotta accents applied
- [x] Sidebar navigation visible on left
- [x] Skill cards have terminal-style headers
- [x] Header has Create/Import buttons and skills count
- [x] All existing functionality preserved
- [x] TypeScript compiles without errors

---

## Design Reference Details

### Color Values (from mockup analysis)
```css
/* Core palette */
--background: hsl(30 20% 98%)     /* Warm off-white */
--foreground: hsl(20 10% 20%)     /* Dark brown-gray */
--card: hsl(0 0% 100%)            /* Pure white */
--primary: hsl(18 65% 52%)        /* Terracotta #C4704B */
--sidebar: hsl(30 15% 97%)        /* Sidebar background */
--sidebar-active: hsl(30 20% 94%) /* Active nav item */
--border: hsl(30 10% 90%)         /* Subtle borders */

/* Terminal dots */
--dot-red: #EF6B5E
--dot-yellow: #F5BD4F  
--dot-green: #61C454
```

### Layout Dimensions
- Sidebar width: ~250px
- Card border-radius: 12px (0.75rem)
- Card shadow: subtle, ~0 2px 8px rgba(0,0,0,0.08)

### Typography
- Headings: System UI, semi-bold
- Body: System UI, regular
- Skill title: Terracotta, semi-bold
- Description prefix "//": Terracotta
