# Markdown Rendering for Skill Detail Dialog

## TL;DR

> **Quick Summary**: Add markdown rendering to the skill detail dialog content area, replacing the current plain text `<pre>` display.
> 
> **Deliverables**:
> - Install `react-markdown` package
> - Update SkillDetailDialog to render markdown content
> - Add appropriate styling for markdown elements
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - sequential
> **Critical Path**: Install → Implement → Style

---

## Context

### Original Request
User wants the skill content (which is markdown) to be rendered properly instead of displayed as plain text.

### Current State
- `SkillDetailDialog.tsx` displays content in a `<pre>` tag with `whitespace-pre-wrap`
- Content is markdown but shows as raw text
- Scrolling now works with native `overflow-y-auto`

---

## Work Objectives

### Core Objective
Render skill markdown content with proper formatting (headings, code blocks, lists, etc.)

### Concrete Deliverables
- Markdown content renders with proper styling
- Code blocks have syntax highlighting (optional, nice-to-have)
- Links, headings, lists display correctly

### Definition of Done
- [ ] `pnpm check` passes
- [ ] Skill detail dialog shows formatted markdown

### Must NOT Have
- No external CSS files
- No breaking existing scroll behavior

---

## TODOs

- [ ] 1. Install react-markdown package

  **What to do**:
  - Run `pnpm add react-markdown`
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Acceptance Criteria**:
  - [ ] Package added to package.json
  - [ ] `pnpm install` succeeds

  **Commit**: NO (group with next)

---

- [ ] 2. Update SkillDetailDialog to use ReactMarkdown

  **What to do**:
  - Import `ReactMarkdown` from `react-markdown`
  - Replace `<pre>` element with `<ReactMarkdown>` component
  - Add `prose` classes for styling (Tailwind typography or custom)

  **References**:
  - `src/components/skills/SkillDetailDialog.tsx` - current implementation
  - Line ~179: `<pre className="text-sm whitespace-pre-wrap font-mono p-4">`

  **Implementation**:
  ```tsx
  import ReactMarkdown from "react-markdown";
  
  // Replace:
  <pre className="text-sm whitespace-pre-wrap font-mono p-4">
    {contentWithoutFrontmatter || "No content available"}
  </pre>
  
  // With:
  <div className="prose prose-sm dark:prose-invert max-w-none p-4">
    <ReactMarkdown>
      {contentWithoutFrontmatter || "No content available"}
    </ReactMarkdown>
  </div>
  ```

  **Styling Notes**:
  - Use Tailwind prose classes if `@tailwindcss/typography` is installed
  - Otherwise, add custom styles for markdown elements:
    - `prose-headings:`, `prose-code:`, `prose-pre:`, etc.
  - If typography plugin not available, add inline styles or custom CSS classes

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Acceptance Criteria**:
  - [ ] `pnpm check` passes
  - [ ] Markdown headings render as headings
  - [ ] Code blocks render with monospace font
  - [ ] Lists render as bullet/numbered lists

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Markdown renders correctly in skill dialog
    Tool: Manual verification (dev server)
    Steps:
      1. Run `pnpm dev:tauri`
      2. Click on a skill card
      3. Verify dialog shows formatted content
    Expected Result: Headings, code, lists display properly
  ```

  **Commit**: YES
  - Message: `feat(ui): add markdown rendering to skill detail dialog`
  - Files: `src/components/skills/SkillDetailDialog.tsx`, `package.json`, `pnpm-lock.yaml`

---

## Success Criteria

### Verification Commands
```bash
pnpm check  # TypeScript passes
```

### Final Checklist
- [ ] react-markdown installed
- [ ] Markdown content renders formatted
- [ ] Scrolling still works
- [ ] TypeScript passes
