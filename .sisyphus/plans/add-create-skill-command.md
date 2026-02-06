# Add create_skill_file Rust Command

## TL;DR

> **Quick Summary**: Add missing Rust backend command `create_skill_file` that the frontend `CreateSkillDialog.tsx` needs to function.
> 
> **Deliverables**:
> - New `create_skill_file` function in `skills.rs`
> - Updated imports and handler registration in `lib.rs`
> 
> **Estimated Effort**: Quick (< 15 min)
> **Parallel Execution**: NO - sequential
> **Critical Path**: skills.rs → lib.rs → verify

---

## Context

The frontend `CreateSkillDialog.tsx` calls `invoke("create_skill_file", {...})` but the command doesn't exist in Rust yet. This causes the Create Skill feature to fail.

---

## TODOs

- [ ] 1. Add create_skill_file command to skills.rs

  **What to do**:
  Add this function at the end of `src-tauri/src/commands/skills.rs` (after line 409):

  ```rust
  #[tauri::command]
  pub fn create_skill_file(skill_name: String, description: String, content: String) -> Result<String, String> {
      let home = get_home_dir().ok_or("Could not find home directory")?;
      let skill_dir = home.join(".agents").join("skills").join(&skill_name);
      
      if skill_dir.exists() {
          return Err(format!("Skill '{}' already exists", skill_name));
      }
      
      fs::create_dir_all(&skill_dir)
          .map_err(|e| format!("Failed to create skill directory: {}", e))?;
      
      let skill_md_path = skill_dir.join("SKILL.md");
      
      let file_content = format!(
          "---\nname: {}\ndescription: \"{}\"\n---\n\n{}",
          skill_name, description, content
      );
      
      fs::write(&skill_md_path, file_content)
          .map_err(|e| format!("Failed to write SKILL.md: {}", e))?;
      
      Ok(skill_dir.to_string_lossy().to_string())
  }
  ```

  **References**:
  - `src-tauri/src/commands/skills.rs` - Add at end of file

  **Acceptance Criteria**:
  - [ ] Function added to skills.rs
  - [ ] Uses existing `get_home_dir()` helper
  - [ ] Creates directory under `~/.agents/skills/{skill_name}/`
  - [ ] Writes SKILL.md with proper frontmatter

---

- [ ] 2. Update lib.rs imports and handler

  **What to do**:
  
  1. Update the import line (line 6-9) to include `create_skill_file`:
  ```rust
  use commands::skills::{
      copy_skill, create_skill_file, delete_skill_directory, get_skill_content, run_skills_add, run_skills_remove,
      scan_global_skills, scan_project_skills, symlink_skill,
  };
  ```

  2. Add `create_skill_file` to the `generate_handler![]` macro (after line 28, after `delete_skill_directory`):
  ```rust
  delete_skill_directory,
  create_skill_file,
  get_sync_config,
  ```

  **References**:
  - `src-tauri/src/lib.rs` - lines 6-9 and 22-46

  **Acceptance Criteria**:
  - [ ] Import includes `create_skill_file`
  - [ ] Handler macro includes `create_skill_file`

---

- [ ] 3. Verify compilation

  **What to do**:
  Run `pnpm check:all` to verify both TypeScript and Rust compile.

  **Acceptance Criteria**:
  - [ ] `pnpm check:all` passes with no errors

---

## Success Criteria

- [ ] `pnpm check:all` passes
- [ ] Create Skill dialog can successfully create new skills
