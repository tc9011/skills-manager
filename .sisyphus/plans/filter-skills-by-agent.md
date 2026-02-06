# Filter Skills by Agent in Sidebar

## TL;DR

> **Quick Summary**: Show only locally-installed agents in sidebar; clicking an agent filters skills to show only those installed in that agent
> 
> **Deliverables**: 
> - Backend: `detect_installed_agents` command
> - Frontend: Sidebar shows only installed agents
> - Frontend: Clicking agent filters skill list
> 
> **Estimated Effort**: Medium (~30 min)
> **Parallel Execution**: NO - sequential changes

---

## Context

### Original Request
侧边栏 agents 下面是显示本机中已经存在的agents，并且点击对应的agents以后，只显示该agents下面的skills

### Current State
- Sidebar shows ALL configured agents (from settings)
- Clicking an agent doesn't filter the skill list
- `skill.installed_in` contains agent IDs where skill is installed (e.g., `["opencode", "claude"]`)

### Required Changes
1. Add backend command to check which agent directories exist on the local machine
2. Sidebar only shows agents whose skill directories exist locally
3. Clicking an agent filters the skill list to show only skills installed in that agent

---

## TODOs

- [ ] 1. Add `detect_installed_agents` backend command

  **What to do**:
  - Add new Tauri command in `src-tauri/src/commands/skills.rs`
  - Takes a list of `(agent_id, path)` tuples
  - Returns list of agent IDs whose paths exist

  **Code to add** (after `create_skill_file` function, before `symlink_skill`):
  ```rust
  #[tauri::command]
  pub fn detect_installed_agents(agents: Vec<(String, String)>) -> Result<Vec<String>, String> {
      let home = get_home_dir().ok_or("Could not find home directory")?;
      let mut installed = Vec::new();

      for (agent_id, path) in agents {
          // Expand ~ to home directory
          let expanded_path = if path.starts_with("~/") {
              home.join(&path[2..])
          } else {
              PathBuf::from(&path)
          };

          if expanded_path.exists() {
              installed.push(agent_id);
          }
      }

      Ok(installed)
  }
  ```

  **References**:
  - `src-tauri/src/commands/skills.rs:368` - Insert after `create_skill_file`
  - `src-tauri/src/lib.rs:6-9` - Add to imports
  - `src-tauri/src/lib.rs:22-46` - Add to generate_handler

  **Acceptance Criteria**:
  - [ ] `pnpm check:rust` passes
  - [ ] Command registered in lib.rs

  **Commit**: NO (group with task 2)

- [ ] 2. Register command in lib.rs

  **What to do**:
  - Import `detect_installed_agents` in `src-tauri/src/lib.rs`
  - Add to `generate_handler![]` macro

  **Changes**:
  ```rust
  // In imports (line 6-9):
  use commands::skills::{
      copy_skill, create_skill_file, delete_skill_directory, detect_installed_agents,
      get_skill_content, run_skills_add, run_skills_remove, scan_global_skills,
      scan_project_skills, symlink_skill,
  };

  // In generate_handler (add after create_skill_file):
  detect_installed_agents,
  ```

  **References**:
  - `src-tauri/src/lib.rs`

  **Acceptance Criteria**:
  - [ ] `pnpm check:all` passes

  **Commit**: YES
  - Message: `feat(backend): add detect_installed_agents command`
  - Files: `src-tauri/src/commands/skills.rs`, `src-tauri/src/lib.rs`

- [ ] 3. Update App.tsx to detect and filter by installed agents

  **What to do**:
  - Call `detect_installed_agents` on load
  - Store list of installed agent IDs
  - Pass to Sidebar
  - Filter skills when agent is selected

  **Changes in App.tsx**:
  ```tsx
  // Add state for installed agents
  const [installedAgentIds, setInstalledAgentIds] = useState<string[]>([]);

  // Add detection function
  const detectInstalledAgents = async () => {
    try {
      const settings = await invoke<AppSettings>("get_app_settings");
      if (settings.agents) {
        const agentPaths: [string, string][] = settings.agents.map(a => [a.id, a.path]);
        const installed = await invoke<string[]>("detect_installed_agents", { agents: agentPaths });
        setInstalledAgentIds(installed);
      }
    } catch (err) {
      console.error("Failed to detect installed agents:", err);
    }
  };

  // Call in useEffect
  useEffect(() => {
    loadActiveProjects();
    loadAgents();
    detectInstalledAgents();
  }, []);

  // Filter skills based on active section
  const filteredSkills = activeSection.startsWith("agent-")
    ? skills.filter(s => s.installed_in.includes(activeSection.replace("agent-", "")))
    : skills;

  // Update Sidebar props
  <Sidebar
    agents={agents.filter(a => installedAgentIds.includes(a.id))}
    projects={activeProjects}
    activeSection={activeSection}
    onSectionChange={setActiveSection}
  />

  // Update SkillsList to use filteredSkills
  <SkillsList
    skills={filteredSkills}
    ...
  />
  ```

  **References**:
  - `src/App.tsx`

  **Acceptance Criteria**:
  - [ ] Sidebar only shows agents that exist on disk
  - [ ] Clicking agent filters skill list
  - [ ] "Central Skills" still shows all skills
  - [ ] `pnpm check` passes

  **Commit**: YES
  - Message: `feat(ui): filter skills by selected agent in sidebar`
  - Files: `src/App.tsx`

---

## Success Criteria

### Verification Commands
```bash
pnpm check:all  # TypeScript + Rust passes
```

### Visual Verification
1. Sidebar shows only agents whose directories exist (e.g., `~/.config/opencode/skills/`)
2. Clicking "Central Skills" shows all skills
3. Clicking an agent (e.g., "OpenCode") shows only skills where `installed_in` includes "opencode"
