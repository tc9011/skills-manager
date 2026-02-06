# Remove Terminal Header from Skill Card

## TL;DR

> **Quick Summary**: Remove the macOS-style terminal header (red/yellow/green dots) from skill cards
> 
> **Deliverables**: 
> - Cleaner skill card without the decorative header
> 
> **Estimated Effort**: Quick (< 5 min)
> **Parallel Execution**: NO - single file change

---

## Context

### Original Request
用户希望去掉 skills 展示卡片上面的区域（Terminal Header with traffic light dots）

### Current State
`SkillCard.tsx` has a "Terminal Header" section (lines 19-27) that displays:
- Red, yellow, green circles (macOS window controls style)
- Skill name in monospace font

User wants this removed for a cleaner look.

---

## TODOs

- [ ] 1. Remove Terminal Header from SkillCard

  **What to do**:
  - Open `src/components/skills/SkillCard.tsx`
  - Delete lines 19-27 (the Terminal Header div)
  - Keep the Content div unchanged

  **Exact change**:
  
  DELETE this section:
  ```tsx
  {/* Terminal Header */}
  <div className="px-4 py-3 border-b border-[hsl(30_10%_90%)] flex items-center gap-2">
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-full bg-[#EF6B5E]" />
      <div className="w-3 h-3 rounded-full bg-[#F5BD4F]" />
      <div className="w-3 h-3 rounded-full bg-[#61C454]" />
    </div>
    <span className="ml-2 text-sm text-[hsl(20_5%_55%)] font-mono">{skill.name}</span>
  </div>
  ```

  **References**:
  - `src/components/skills/SkillCard.tsx:19-27` - Section to remove

  **Acceptance Criteria**:
  - [ ] Terminal header (traffic light dots) no longer visible
  - [ ] `pnpm check` passes
  - [ ] Card still displays: title, badges, description, action buttons

  **Commit**: YES
  - Message: `fix(ui): remove terminal header from skill cards`
  - Files: `src/components/skills/SkillCard.tsx`

---

## Success Criteria

### Verification Commands
```bash
pnpm check  # TypeScript passes
```

### Visual Verification
- Skill cards show content directly without the header bar with colored dots
