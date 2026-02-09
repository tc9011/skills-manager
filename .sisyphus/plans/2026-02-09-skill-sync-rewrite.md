# Skill Sync - Complete Application Rewrite

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Skills Manager into "Skill Sync" - a centralized skill synchronization hub with Git-level version control, multi-backend sources, and conflict resolution.

**Architecture:**
```
Sources (GitHub/Local/Cloud) → Central (~/.agents/skills/ as Git repo) → Agents/Projects
```
Central serves as the hub: pull skills from any source, push to agents. Git-level versioning enables full history, diff, rollback, and conflict resolution.

**Tech Stack:**
- Frontend: React 19, TypeScript, Vite 7, Tailwind CSS v4, shadcn/ui
- Backend: Rust, Tauri 2, git2 (libgit2 bindings)
- Existing: Keep tauri-plugin-fs, shell, dialog, opener

---

## Phase 0: Project Rename & Setup

### Task 0.1: Rename Application to "Skill Sync"

**Files:**
- Modify: `package.json` (lines 2-4)
- Modify: `src-tauri/Cargo.toml` (lines 1-5)
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src/App.tsx` (line 224)
- Modify: `src/components/layout/Sidebar.tsx` (logo text)
- Modify: `README.md` (title)
- Modify: `AGENTS.md` (title)

**Step 1: Update package.json**
```json
{
  "name": "skill-sync",
  "version": "0.2.0",
```

**Step 2: Update Cargo.toml**
```toml
[package]
name = "skill-sync"
version = "0.2.0"
description = "Skill synchronization hub for AI coding agents"
```

**Step 3: Update tauri.conf.json**
- Change `productName` to "Skill Sync"
- Change `identifier` to "com.skillsync.app"
- Update window title

**Step 4: Update UI references**
- `src/App.tsx`: Change header text "Skills Manager" → "Skill Sync"
- `src/components/layout/Sidebar.tsx`: Change logo text

**Step 5: Verify**
Run: `pnpm check && pnpm check:rust`
Expected: No errors

**Step 6: Commit**
```bash
git add -A
git commit -m "chore: rename application from Skills Manager to Skill Sync"
```

---

### Task 0.2: Add git2 Dependency

**Files:**
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add git2 to dependencies**
```toml
[dependencies]
# ... existing deps ...
git2 = "0.20"
```

**Step 2: Verify Rust compiles**
Run: `cd src-tauri && cargo check`
Expected: Successful compilation (git2 has native deps, may take time on first build)

**Step 3: Commit**
```bash
git add src-tauri/Cargo.toml
git commit -m "deps: add git2 for native Git operations"
```

---

## Phase 1: Backend - Core Git Operations with git2

### Task 1.1: Create Version Control Module

**Files:**
- Create: `src-tauri/src/commands/version.rs`
- Modify: `src-tauri/src/commands/mod.rs`

**Step 1: Create version.rs with core types**
```rust
use git2::{Repository, StatusOptions, Signature, DiffOptions, ObjectType, Oid};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommitInfo {
    pub id: String,
    pub short_id: String,
    pub message: String,
    pub author: String,
    pub email: String,
    pub timestamp: i64,
    pub files_changed: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileStatus {
    pub path: String,
    pub status: String, // "new", "modified", "deleted", "renamed", "untracked"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffResult {
    pub files: Vec<FileDiff>,
    pub stats: DiffStats,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileDiff {
    pub path: String,
    pub old_path: Option<String>,
    pub status: String,
    pub hunks: Vec<DiffHunk>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffHunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffLine {
    pub origin: char, // '+', '-', ' '
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffStats {
    pub files_changed: u32,
    pub insertions: u32,
    pub deletions: u32,
}
```

**Step 2: Add module to mod.rs**
```rust
pub mod version;
```

**Step 3: Verify**
Run: `cd src-tauri && cargo check`
Expected: Compiles

**Step 4: Commit**
```bash
git add src-tauri/src/commands/version.rs src-tauri/src/commands/mod.rs
git commit -m "feat(backend): add version control types for git2 integration"
```

---

### Task 1.2: Implement Repository Initialization & Status

**Files:**
- Modify: `src-tauri/src/commands/version.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add init_central_repo command**
```rust
fn get_central_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home.join(".agents").join("skills"))
}

#[tauri::command]
pub fn init_central_repo() -> Result<String, String> {
    let path = get_central_path()?;
    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))?;
    
    if path.join(".git").exists() {
        return Ok("Repository already initialized".to_string());
    }
    
    Repository::init(&path).map_err(|e| format!("Failed to init repo: {}", e))?;
    Ok(format!("Initialized repository at {:?}", path))
}
```

**Step 2: Add get_repo_status command**
```rust
#[tauri::command]
pub fn get_repo_status() -> Result<Vec<FileStatus>, String> {
    let path = get_central_path()?;
    let repo = Repository::open(&path).map_err(|e| format!("Failed to open repo: {}", e))?;
    
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.recurse_untracked_dirs(true);
    
    let statuses = repo.statuses(Some(&mut opts))
        .map_err(|e| format!("Failed to get status: {}", e))?;
    
    let mut result = Vec::new();
    for entry in statuses.iter() {
        let status = entry.status();
        let status_str = if status.is_index_new() || status.is_wt_new() {
            "new"
        } else if status.is_index_modified() || status.is_wt_modified() {
            "modified"
        } else if status.is_index_deleted() || status.is_wt_deleted() {
            "deleted"
        } else if status.is_index_renamed() || status.is_wt_renamed() {
            "renamed"
        } else {
            "untracked"
        };
        
        if let Some(path) = entry.path() {
            result.push(FileStatus {
                path: path.to_string(),
                status: status_str.to_string(),
            });
        }
    }
    
    Ok(result)
}
```

**Step 3: Register commands in lib.rs**
Add to generate_handler![]:
```rust
commands::version::init_central_repo,
commands::version::get_repo_status,
```

**Step 4: Verify**
Run: `cd src-tauri && cargo check`

**Step 5: Commit**
```bash
git add -A
git commit -m "feat(backend): add init_central_repo and get_repo_status commands"
```

---

### Task 1.3: Implement Commit Operations

**Files:**
- Modify: `src-tauri/src/commands/version.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add create_commit command**
```rust
#[tauri::command]
pub fn create_commit(message: String, author_name: Option<String>, author_email: Option<String>) -> Result<CommitInfo, String> {
    let path = get_central_path()?;
    let repo = Repository::open(&path).map_err(|e| format!("Failed to open repo: {}", e))?;
    
    let mut index = repo.index().map_err(|e| format!("Failed to get index: {}", e))?;
    
    // Stage all changes
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("Failed to add files: {}", e))?;
    index.write().map_err(|e| format!("Failed to write index: {}", e))?;
    
    let tree_id = index.write_tree().map_err(|e| format!("Failed to write tree: {}", e))?;
    let tree = repo.find_tree(tree_id).map_err(|e| format!("Failed to find tree: {}", e))?;
    
    let name = author_name.unwrap_or_else(|| "Skill Sync".to_string());
    let email = author_email.unwrap_or_else(|| "sync@skills.local".to_string());
    let sig = Signature::now(&name, &email).map_err(|e| format!("Failed to create signature: {}", e))?;
    
    let parent_commit = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
    let parents: Vec<&git2::Commit> = parent_commit.iter().collect();
    
    let commit_id = repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| format!("Failed to create commit: {}", e))?;
    
    let commit = repo.find_commit(commit_id).map_err(|e| format!("Failed to find commit: {}", e))?;
    
    Ok(CommitInfo {
        id: commit_id.to_string(),
        short_id: commit_id.to_string()[..7].to_string(),
        message: message.clone(),
        author: name,
        email,
        timestamp: commit.time().seconds(),
        files_changed: 0, // TODO: calculate from diff
    })
}
```

**Step 2: Register in lib.rs**

**Step 3: Verify & Commit**

---

### Task 1.4: Implement Commit History (Log)

**Files:**
- Modify: `src-tauri/src/commands/version.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add get_commit_history command**
```rust
#[tauri::command]
pub fn get_commit_history(limit: Option<u32>, skip: Option<u32>) -> Result<Vec<CommitInfo>, String> {
    let path = get_central_path()?;
    let repo = Repository::open(&path).map_err(|e| format!("Failed to open repo: {}", e))?;
    
    let head = repo.head().map_err(|e| format!("Failed to get HEAD: {}", e))?;
    let head_commit = head.peel_to_commit().map_err(|e| format!("Failed to get commit: {}", e))?;
    
    let mut revwalk = repo.revwalk().map_err(|e| format!("Failed to create revwalk: {}", e))?;
    revwalk.push(head_commit.id()).map_err(|e| format!("Failed to push commit: {}", e))?;
    revwalk.set_sorting(git2::Sort::TIME).map_err(|e| format!("Failed to set sorting: {}", e))?;
    
    let skip_count = skip.unwrap_or(0) as usize;
    let limit_count = limit.unwrap_or(50) as usize;
    
    let commits: Vec<CommitInfo> = revwalk
        .skip(skip_count)
        .take(limit_count)
        .filter_map(|oid| oid.ok())
        .filter_map(|oid| repo.find_commit(oid).ok())
        .map(|commit| {
            CommitInfo {
                id: commit.id().to_string(),
                short_id: commit.id().to_string()[..7].to_string(),
                message: commit.message().unwrap_or("").to_string(),
                author: commit.author().name().unwrap_or("").to_string(),
                email: commit.author().email().unwrap_or("").to_string(),
                timestamp: commit.time().seconds(),
                files_changed: 0,
            }
        })
        .collect();
    
    Ok(commits)
}
```

**Step 2: Register in lib.rs**

**Step 3: Verify & Commit**
```bash
git commit -m "feat(backend): add get_commit_history command"
```

---

### Task 1.5: Implement Diff Operations

**Files:**
- Modify: `src-tauri/src/commands/version.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add get_working_diff command**
```rust
#[tauri::command]
pub fn get_working_diff() -> Result<DiffResult, String> {
    let path = get_central_path()?;
    let repo = Repository::open(&path).map_err(|e| format!("Failed to open repo: {}", e))?;
    
    let head = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
    
    let mut opts = DiffOptions::new();
    opts.include_untracked(true);
    
    let diff = repo.diff_tree_to_workdir_with_index(head.as_ref(), Some(&mut opts))
        .map_err(|e| format!("Failed to create diff: {}", e))?;
    
    let mut files = Vec::new();
    let stats = diff.stats().map_err(|e| format!("Failed to get stats: {}", e))?;
    
    diff.foreach(
        &mut |delta, _| {
            let path = delta.new_file().path().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
            let old_path = delta.old_file().path().map(|p| p.to_string_lossy().to_string());
            let status = match delta.status() {
                git2::Delta::Added => "added",
                git2::Delta::Deleted => "deleted",
                git2::Delta::Modified => "modified",
                git2::Delta::Renamed => "renamed",
                _ => "unknown",
            };
            files.push(FileDiff {
                path,
                old_path,
                status: status.to_string(),
                hunks: Vec::new(),
            });
            true
        },
        None,
        None,
        None,
    ).map_err(|e| format!("Failed to iterate diff: {}", e))?;
    
    Ok(DiffResult {
        files,
        stats: DiffStats {
            files_changed: stats.files_changed() as u32,
            insertions: stats.insertions() as u32,
            deletions: stats.deletions() as u32,
        },
    })
}
```

**Step 2: Add get_commit_diff command** (diff between two commits)
```rust
#[tauri::command]
pub fn get_commit_diff(commit_id: String) -> Result<DiffResult, String> {
    let path = get_central_path()?;
    let repo = Repository::open(&path).map_err(|e| format!("Failed to open repo: {}", e))?;
    
    let oid = Oid::from_str(&commit_id).map_err(|e| format!("Invalid commit ID: {}", e))?;
    let commit = repo.find_commit(oid).map_err(|e| format!("Commit not found: {}", e))?;
    let tree = commit.tree().map_err(|e| format!("Failed to get tree: {}", e))?;
    
    let parent_tree = commit.parent(0).ok().and_then(|p| p.tree().ok());
    
    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)
        .map_err(|e| format!("Failed to create diff: {}", e))?;
    
    // Similar processing as get_working_diff...
    let stats = diff.stats().map_err(|e| format!("Failed to get stats: {}", e))?;
    
    Ok(DiffResult {
        files: Vec::new(), // TODO: populate
        stats: DiffStats {
            files_changed: stats.files_changed() as u32,
            insertions: stats.insertions() as u32,
            deletions: stats.deletions() as u32,
        },
    })
}
```

**Step 3: Register in lib.rs**

**Step 4: Verify & Commit**
```bash
git commit -m "feat(backend): add diff commands for working tree and commits"
```

---

### Task 1.6: Implement Checkout & Rollback

**Files:**
- Modify: `src-tauri/src/commands/version.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add checkout_commit command**
```rust
#[tauri::command]
pub fn checkout_commit(commit_id: String) -> Result<String, String> {
    let path = get_central_path()?;
    let repo = Repository::open(&path).map_err(|e| format!("Failed to open repo: {}", e))?;
    
    let oid = Oid::from_str(&commit_id).map_err(|e| format!("Invalid commit ID: {}", e))?;
    let commit = repo.find_commit(oid).map_err(|e| format!("Commit not found: {}", e))?;
    
    let mut checkout_builder = git2::build::CheckoutBuilder::new();
    checkout_builder.force();
    
    repo.checkout_tree(commit.as_object(), Some(&mut checkout_builder))
        .map_err(|e| format!("Failed to checkout: {}", e))?;
    
    repo.set_head_detached(oid).map_err(|e| format!("Failed to set HEAD: {}", e))?;
    
    Ok(format!("Checked out commit {}", &commit_id[..7]))
}
```

**Step 2: Add revert_to_commit command** (creates a new commit that undoes changes)
```rust
#[tauri::command]
pub fn revert_to_commit(commit_id: String) -> Result<CommitInfo, String> {
    // First checkout the commit
    checkout_commit(commit_id.clone())?;
    
    // Then create a new commit on top
    create_commit(
        format!("Revert to {}", &commit_id[..7]),
        None,
        None,
    )
}
```

**Step 3: Register in lib.rs**

**Step 4: Verify & Commit**
```bash
git commit -m "feat(backend): add checkout_commit and revert_to_commit commands"
```

---

## Phase 2: Backend - Source Management

### Task 2.1: Define Source Types

**Files:**
- Create: `src-tauri/src/commands/sources.rs`
- Modify: `src-tauri/src/commands/mod.rs`

**Step 1: Create sources.rs with types**
```rust
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum SkillSource {
    #[serde(rename = "github")]
    GitHub {
        id: String,
        name: String,
        repo_url: String,
        branch: String,
        path: Option<String>, // subdirectory within repo
    },
    #[serde(rename = "local")]
    Local {
        id: String,
        name: String,
        path: String,
    },
    #[serde(rename = "registry")]
    Registry {
        id: String,
        name: String,
        url: String, // e.g., "https://skills.sh"
    },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SourceConfig {
    pub sources: Vec<SkillSource>,
}

impl Default for SourceConfig {
    fn default() -> Self {
        Self { sources: Vec::new() }
    }
}
```

**Step 2: Add CRUD operations for sources**
```rust
use std::fs;

fn get_sources_config_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let config_dir = home.join(".config").join("skill-sync");
    fs::create_dir_all(&config_dir).map_err(|e| format!("Failed to create config dir: {}", e))?;
    Ok(config_dir.join("sources.json"))
}

#[tauri::command]
pub fn get_sources() -> Result<Vec<SkillSource>, String> {
    let path = get_sources_config_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read: {}", e))?;
    let config: SourceConfig = serde_json::from_str(&content).unwrap_or_default();
    Ok(config.sources)
}

#[tauri::command]
pub fn add_source(source: SkillSource) -> Result<(), String> {
    let mut sources = get_sources()?;
    sources.push(source);
    save_sources(sources)
}

#[tauri::command]
pub fn remove_source(source_id: String) -> Result<(), String> {
    let sources = get_sources()?;
    let filtered: Vec<_> = sources.into_iter().filter(|s| {
        match s {
            SkillSource::GitHub { id, .. } => id != &source_id,
            SkillSource::Local { id, .. } => id != &source_id,
            SkillSource::Registry { id, .. } => id != &source_id,
        }
    }).collect();
    save_sources(filtered)
}

fn save_sources(sources: Vec<SkillSource>) -> Result<(), String> {
    let path = get_sources_config_path()?;
    let config = SourceConfig { sources };
    let content = serde_json::to_string_pretty(&config).map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write: {}", e))
}
```

**Step 3: Add to mod.rs and register in lib.rs**

**Step 4: Verify & Commit**
```bash
git commit -m "feat(backend): add source management (GitHub, local, registry)"
```

---

### Task 2.2: Implement Source Sync Operations

**Files:**
- Modify: `src-tauri/src/commands/sources.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add sync_from_source command**
```rust
#[tauri::command]
pub fn sync_from_source(source_id: String) -> Result<SyncResult, String> {
    let sources = get_sources()?;
    let source = sources.iter().find(|s| {
        match s {
            SkillSource::GitHub { id, .. } => id == &source_id,
            SkillSource::Local { id, .. } => id == &source_id,
            SkillSource::Registry { id, .. } => id == &source_id,
        }
    }).ok_or("Source not found")?;
    
    match source {
        SkillSource::GitHub { repo_url, branch, path, .. } => {
            sync_from_github(repo_url, branch, path.as_deref())
        }
        SkillSource::Local { path, .. } => {
            sync_from_local(path)
        }
        SkillSource::Registry { url, .. } => {
            Err("Registry sync not yet implemented".to_string())
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub skills_synced: Vec<String>,
    pub conflicts: Vec<ConflictInfo>,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConflictInfo {
    pub skill_name: String,
    pub source_version: String,
    pub central_version: String,
    pub conflict_type: String, // "modified_both", "deleted_source", "deleted_central"
}
```

**Step 2: Implement GitHub sync**
```rust
fn sync_from_github(repo_url: &str, branch: &str, subpath: Option<&str>) -> Result<SyncResult, String> {
    // Clone to temp directory
    let temp_dir = std::env::temp_dir().join(format!("skill-sync-{}", uuid::Uuid::new_v4()));
    
    // Clone using git2
    let mut builder = git2::build::RepoBuilder::new();
    builder.branch(branch);
    
    let repo = builder.clone(repo_url, &temp_dir)
        .map_err(|e| format!("Failed to clone: {}", e))?;
    
    // Copy skills from temp to central
    let source_dir = match subpath {
        Some(p) => temp_dir.join(p),
        None => temp_dir.clone(),
    };
    
    let central = get_central_path()?;
    let mut synced = Vec::new();
    
    // Copy each skill directory
    if let Ok(entries) = std::fs::read_dir(&source_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() && path.join("SKILL.md").exists() {
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                let dest = central.join(&name);
                // TODO: Check for conflicts before overwriting
                copy_dir_all(&path, &dest)?;
                synced.push(name);
            }
        }
    }
    
    // Cleanup temp
    let _ = std::fs::remove_dir_all(&temp_dir);
    
    Ok(SyncResult {
        success: true,
        skills_synced: synced,
        conflicts: Vec::new(),
        message: "Sync completed".to_string(),
    })
}
```

**Step 3: Implement local sync**
```rust
fn sync_from_local(source_path: &str) -> Result<SyncResult, String> {
    let source = PathBuf::from(source_path);
    if !source.exists() {
        return Err("Source directory does not exist".to_string());
    }
    
    let central = get_central_path()?;
    let mut synced = Vec::new();
    
    if let Ok(entries) = std::fs::read_dir(&source) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() && path.join("SKILL.md").exists() {
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                let dest = central.join(&name);
                copy_dir_all(&path, &dest)?;
                synced.push(name);
            }
        }
    }
    
    Ok(SyncResult {
        success: true,
        skills_synced: synced,
        conflicts: Vec::new(),
        message: "Sync completed".to_string(),
    })
}
```

**Step 4: Register in lib.rs**

**Step 5: Add uuid dependency to Cargo.toml**
```toml
uuid = { version = "1", features = ["v4"] }
```

**Step 6: Verify & Commit**
```bash
git commit -m "feat(backend): add sync_from_source for GitHub and local sources"
```

---

### Task 2.3: Implement Conflict Detection

**Files:**
- Modify: `src-tauri/src/commands/sources.rs`

**Step 1: Add conflict detection before copy**
```rust
fn detect_conflicts(source_path: &PathBuf, dest_path: &PathBuf) -> Option<ConflictInfo> {
    if !dest_path.exists() {
        return None; // No conflict, destination doesn't exist
    }
    
    let source_skill = dest_path.join("SKILL.md");
    let dest_skill = dest_path.join("SKILL.md");
    
    if !source_skill.exists() || !dest_skill.exists() {
        return None;
    }
    
    let source_content = std::fs::read_to_string(&source_skill).unwrap_or_default();
    let dest_content = std::fs::read_to_string(&dest_skill).unwrap_or_default();
    
    if source_content != dest_content {
        Some(ConflictInfo {
            skill_name: dest_path.file_name().unwrap().to_string_lossy().to_string(),
            source_version: compute_hash(&source_content),
            central_version: compute_hash(&dest_content),
            conflict_type: "modified_both".to_string(),
        })
    } else {
        None
    }
}

fn compute_hash(content: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    format!("{:x}", hasher.finish())[..8].to_string()
}
```

**Step 2: Update sync functions to return conflicts instead of overwriting**

**Step 3: Verify & Commit**
```bash
git commit -m "feat(backend): add conflict detection during source sync"
```

---

### Task 2.4: Implement Conflict Resolution

**Files:**
- Modify: `src-tauri/src/commands/sources.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add resolve_conflict command**
```rust
#[derive(Debug, Serialize, Deserialize)]
pub enum ConflictResolution {
    KeepCentral,
    UseSource,
    Merge, // For future: open merge editor
}

#[tauri::command]
pub fn resolve_conflict(
    skill_name: String, 
    source_id: String,
    resolution: ConflictResolution,
) -> Result<(), String> {
    match resolution {
        ConflictResolution::KeepCentral => {
            // Do nothing, central version stays
            Ok(())
        }
        ConflictResolution::UseSource => {
            // Re-sync just this skill, forcing overwrite
            force_sync_skill(&skill_name, &source_id)
        }
        ConflictResolution::Merge => {
            Err("Merge resolution not yet implemented".to_string())
        }
    }
}
```

**Step 2: Register in lib.rs**

**Step 3: Verify & Commit**
```bash
git commit -m "feat(backend): add conflict resolution commands"
```

---

## Phase 3: Backend - Agent Distribution

### Task 3.1: Implement Push to Agents

**Files:**
- Modify: `src-tauri/src/commands/skills.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add push_to_agent command**
```rust
#[tauri::command]
pub fn push_to_agent(skill_name: String, agent_id: String) -> Result<String, String> {
    let home = get_home_dir().ok_or("Could not find home directory")?;
    let settings = get_app_settings().map_err(|e| format!("Failed to get settings: {}", e))?;
    
    let agent = settings.agents.iter()
        .find(|a| a.id == agent_id)
        .ok_or("Agent not found")?;
    
    let agent_path = if agent.path.starts_with("~/") {
        home.join(&agent.path[2..])
    } else {
        PathBuf::from(&agent.path)
    };
    
    let source = home.join(".agents").join("skills").join(&skill_name);
    if !source.exists() {
        return Err("Skill not found in central".to_string());
    }
    
    let dest = agent_path.join(&skill_name);
    
    // Create symlink (preferred) or copy
    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;
        if dest.exists() {
            std::fs::remove_dir_all(&dest).ok();
        }
        std::fs::create_dir_all(&agent_path).map_err(|e| format!("Failed to create agent dir: {}", e))?;
        symlink(&source, &dest).map_err(|e| format!("Failed to create symlink: {}", e))?;
    }
    
    Ok(dest.to_string_lossy().to_string())
}
```

**Step 2: Add push_to_all_agents command**
```rust
#[tauri::command]
pub fn push_to_all_agents(skill_name: String) -> Result<Vec<String>, String> {
    let settings = get_app_settings().map_err(|e| format!("Failed to get settings: {}", e))?;
    let home = get_home_dir().ok_or("Could not find home directory")?;
    
    let mut results = Vec::new();
    
    for agent in &settings.agents {
        if agent.enabled {
            let agent_path = if agent.path.starts_with("~/") {
                home.join(&agent.path[2..])
            } else {
                PathBuf::from(&agent.path)
            };
            
            if agent_path.exists() {
                match push_to_agent(skill_name.clone(), agent.id.clone()) {
                    Ok(path) => results.push(path),
                    Err(e) => eprintln!("Failed to push to {}: {}", agent.name, e),
                }
            }
        }
    }
    
    Ok(results)
}
```

**Step 3: Register in lib.rs**

**Step 4: Verify & Commit**
```bash
git commit -m "feat(backend): add push_to_agent and push_to_all_agents commands"
```

---

## Phase 4: Frontend - New UI Architecture

### Task 4.1: Create Source Management UI Types

**Files:**
- Create: `src/types/source.ts`
- Modify: `src/types/skill.ts`

**Step 1: Create source.ts**
```typescript
export interface GitHubSource {
  type: "github";
  id: string;
  name: string;
  repo_url: string;
  branch: string;
  path?: string;
}

export interface LocalSource {
  type: "local";
  id: string;
  name: string;
  path: string;
}

export interface RegistrySource {
  type: "registry";
  id: string;
  name: string;
  url: string;
}

export type SkillSource = GitHubSource | LocalSource | RegistrySource;

export interface SyncResult {
  success: boolean;
  skills_synced: string[];
  conflicts: ConflictInfo[];
  message: string;
}

export interface ConflictInfo {
  skill_name: string;
  source_version: string;
  central_version: string;
  conflict_type: "modified_both" | "deleted_source" | "deleted_central";
}
```

**Step 2: Verify & Commit**
```bash
git commit -m "feat(frontend): add source management TypeScript types"
```

---

### Task 4.2: Create Version History Types

**Files:**
- Create: `src/types/version.ts`

**Step 1: Create version.ts**
```typescript
export interface CommitInfo {
  id: string;
  short_id: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  files_changed: number;
}

export interface FileStatus {
  path: string;
  status: "new" | "modified" | "deleted" | "renamed" | "untracked";
}

export interface DiffResult {
  files: FileDiff[];
  stats: DiffStats;
}

export interface FileDiff {
  path: string;
  old_path?: string;
  status: string;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  origin: "+" | "-" | " ";
  content: string;
}

export interface DiffStats {
  files_changed: number;
  insertions: number;
  deletions: number;
}
```

**Step 2: Verify & Commit**
```bash
git commit -m "feat(frontend): add version history TypeScript types"
```

---

### Task 4.3: Create Sources Panel Component

**Files:**
- Create: `src/components/sources/SourcesPanel.tsx`
- Create: `src/components/sources/SourceCard.tsx`
- Create: `src/components/sources/AddSourceDialog.tsx`

**Step 1: Create SourceCard.tsx**
```tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, Folder, Globe, RefreshCw, Trash2 } from "lucide-react";
import type { SkillSource } from "@/types/source";

interface SourceCardProps {
  source: SkillSource;
  onSync: () => void;
  onDelete: () => void;
  syncing?: boolean;
}

export function SourceCard({ source, onSync, onDelete, syncing }: SourceCardProps) {
  const getIcon = () => {
    switch (source.type) {
      case "github": return <GitBranch className="h-5 w-5" />;
      case "local": return <Folder className="h-5 w-5" />;
      case "registry": return <Globe className="h-5 w-5" />;
    }
  };

  const getSubtitle = () => {
    switch (source.type) {
      case "github": return `${source.repo_url} @ ${source.branch}`;
      case "local": return source.path;
      case "registry": return source.url;
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-md">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-medium">{source.name}</h3>
            <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSync}
            disabled={syncing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

**Step 2: Create SourcesPanel.tsx**
```tsx
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { SourceCard } from "./SourceCard";
import { AddSourceDialog } from "./AddSourceDialog";
import { Plus } from "lucide-react";
import type { SkillSource, SyncResult } from "@/types/source";
import { toast } from "sonner";

export function SourcesPanel() {
  const [sources, setSources] = useState<SkillSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const loadSources = async () => {
    try {
      const result = await invoke<SkillSource[]>("get_sources");
      setSources(result);
    } catch (err) {
      console.error("Failed to load sources:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleSync = async (sourceId: string) => {
    setSyncingId(sourceId);
    try {
      const result = await invoke<SyncResult>("sync_from_source", { sourceId });
      if (result.conflicts.length > 0) {
        toast.warning(`Synced with ${result.conflicts.length} conflicts`);
      } else {
        toast.success(`Synced ${result.skills_synced.length} skills`);
      }
    } catch (err) {
      toast.error(`Sync failed: ${err}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (sourceId: string) => {
    try {
      await invoke("remove_source", { sourceId });
      loadSources();
      toast.success("Source removed");
    } catch (err) {
      toast.error(`Failed to remove: ${err}`);
    }
  };

  if (loading) {
    return <div className="p-6">Loading sources...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Skill Sources</h2>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Source
        </Button>
      </div>

      <div className="space-y-3">
        {sources.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            onSync={() => handleSync(source.id)}
            onDelete={() => handleDelete(source.id)}
            syncing={syncingId === source.id}
          />
        ))}
        {sources.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No sources configured. Add a GitHub repo or local directory to get started.
          </p>
        )}
      </div>

      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={loadSources}
      />
    </div>
  );
}
```

**Step 3: Create AddSourceDialog.tsx**
(Radio buttons to select type, then appropriate fields for each type)

**Step 4: Verify & Commit**
```bash
git commit -m "feat(frontend): add sources management panel and components"
```

---

### Task 4.4: Create Version History Panel

**Files:**
- Create: `src/components/version/VersionPanel.tsx`
- Create: `src/components/version/CommitList.tsx`
- Create: `src/components/version/DiffViewer.tsx`

**Step 1: Create CommitList.tsx**
```tsx
import { formatDistanceToNow } from "date-fns";
import type { CommitInfo } from "@/types/version";

interface CommitListProps {
  commits: CommitInfo[];
  selectedId?: string;
  onSelect: (commit: CommitInfo) => void;
}

export function CommitList({ commits, selectedId, onSelect }: CommitListProps) {
  return (
    <div className="space-y-1">
      {commits.map((commit) => (
        <button
          key={commit.id}
          onClick={() => onSelect(commit)}
          className={`w-full text-left p-3 rounded-md transition-colors ${
            selectedId === commit.id
              ? "bg-primary/10 border border-primary"
              : "hover:bg-muted"
          }`}
        >
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
              {commit.short_id}
            </code>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(commit.timestamp * 1000, { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm mt-1 line-clamp-2">{commit.message}</p>
          <p className="text-xs text-muted-foreground mt-1">{commit.author}</p>
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Create DiffViewer.tsx**
```tsx
import type { DiffResult, DiffLine } from "@/types/version";

interface DiffViewerProps {
  diff: DiffResult;
}

export function DiffViewer({ diff }: DiffViewerProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span className="text-green-600">+{diff.stats.insertions}</span>
        <span className="text-red-600">-{diff.stats.deletions}</span>
        <span className="text-muted-foreground">{diff.stats.files_changed} files</span>
      </div>
      
      {diff.files.map((file) => (
        <div key={file.path} className="border rounded-md overflow-hidden">
          <div className="bg-muted px-3 py-2 text-sm font-mono">
            {file.status === "renamed" && file.old_path && (
              <span className="text-muted-foreground">{file.old_path} → </span>
            )}
            {file.path}
          </div>
          <div className="bg-background font-mono text-sm">
            {file.hunks.map((hunk, i) => (
              <div key={i}>
                <div className="bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                  @@ -{hunk.old_start},{hunk.old_lines} +{hunk.new_start},{hunk.new_lines} @@
                </div>
                {hunk.lines.map((line, j) => (
                  <div
                    key={j}
                    className={`px-3 py-0.5 ${
                      line.origin === "+"
                        ? "bg-green-500/10 text-green-700"
                        : line.origin === "-"
                        ? "bg-red-500/10 text-red-700"
                        : ""
                    }`}
                  >
                    <span className="select-none opacity-50">{line.origin}</span>
                    {line.content}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Create VersionPanel.tsx** (combines CommitList + DiffViewer)

**Step 4: Verify & Commit**
```bash
git commit -m "feat(frontend): add version history panel with commit list and diff viewer"
```

---

### Task 4.5: Create Conflict Resolution Dialog

**Files:**
- Create: `src/components/sync/ConflictDialog.tsx`

**Step 1: Create ConflictDialog.tsx**
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";
import type { ConflictInfo } from "@/types/source";
import { toast } from "sonner";

interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictInfo[];
  sourceId: string;
  onResolved: () => void;
}

export function ConflictDialog({ 
  open, 
  onOpenChange, 
  conflicts, 
  sourceId,
  onResolved 
}: ConflictDialogProps) {
  const handleResolve = async (skillName: string, resolution: "KeepCentral" | "UseSource") => {
    try {
      await invoke("resolve_conflict", { 
        skillName, 
        sourceId,
        resolution 
      });
      toast.success(`Resolved conflict for ${skillName}`);
      onResolved();
    } catch (err) {
      toast.error(`Failed to resolve: ${err}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resolve Conflicts ({conflicts.length})</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {conflicts.map((conflict) => (
            <div key={conflict.skill_name} className="border rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{conflict.skill_name}</h3>
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  {conflict.conflict_type}
                </span>
              </div>
              
              <div className="flex gap-2 text-xs mb-3">
                <span>Source: <code>{conflict.source_version}</code></span>
                <span>Central: <code>{conflict.central_version}</code></span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleResolve(conflict.skill_name, "KeepCentral")}
                >
                  Keep Central
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleResolve(conflict.skill_name, "UseSource")}
                >
                  Use Source
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Verify & Commit**
```bash
git commit -m "feat(frontend): add conflict resolution dialog"
```

---

### Task 4.6: Update Sidebar for New Navigation

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: Add new navigation sections**
- Add "Sources" under GENERAL section
- Add "History" under GENERAL section
- Keep existing AGENTS and PROJECTS sections

**Step 2: Update logo text to "Skill Sync"**

**Step 3: Verify & Commit**
```bash
git commit -m "refactor(frontend): update sidebar for Skill Sync navigation"
```

---

### Task 4.7: Update App.tsx for New Routing

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add new section handlers**
```tsx
const renderMainContent = () => {
  if (activeSection === "settings") {
    return <SettingsPanel />;
  }
  if (activeSection === "sources") {
    return <SourcesPanel />;
  }
  if (activeSection === "history") {
    return <VersionPanel />;
  }
  // ... existing sections
};
```

**Step 2: Import new components**

**Step 3: Update header title to "Skill Sync"**

**Step 4: Verify & Commit**
```bash
git commit -m "refactor(frontend): integrate new panels into App routing"
```

---

## Phase 5: Integration & Testing

### Task 5.1: Update Sync Panel for New Architecture

**Files:**
- Modify: `src/components/sync/SyncPanel.tsx`

**Step 1: Remove old GitHub-only sync UI**

**Step 2: Add "Quick sync from sources" button that syncs all sources**

**Step 3: Add link to Sources panel for configuration**

**Step 4: Show recent sync activity**

**Step 5: Verify & Commit**
```bash
git commit -m "refactor(frontend): update SyncPanel for multi-source architecture"
```

---

### Task 5.2: Full Integration Test

**Files:** None (manual testing)

**Step 1: Start app**
Run: `pnpm dev:tauri`

**Step 2: Test source management**
- Add a GitHub source
- Add a local directory source
- Sync from each source
- Verify skills appear in Central

**Step 3: Test version history**
- Make changes to Central
- Create a commit
- View commit history
- View diff
- Rollback to previous commit

**Step 4: Test conflict resolution**
- Modify same skill in source and Central
- Sync → conflict should be detected
- Resolve conflict using each option

**Step 5: Test agent distribution**
- Push skill to single agent
- Push skill to all agents
- Verify symlinks created

**Step 6: Document any issues**

---

### Task 5.3: Final Cleanup & Polish

**Files:** Various

**Step 1: Remove deprecated sync.rs commands** (keep only what's needed)

**Step 2: Update README.md with new features**

**Step 3: Update AGENTS.md with new architecture**

**Step 4: Final typecheck**
Run: `pnpm check:all`
Expected: No errors

**Step 5: Final commit**
```bash
git add -A
git commit -m "chore: final cleanup and documentation for Skill Sync v0.2.0"
```

---

## Success Criteria

### Verification Commands
```bash
pnpm check           # TypeScript: No errors
pnpm check:rust      # Rust: No errors
pnpm dev:tauri       # App runs without crashes
```

### Feature Checklist
- [ ] App renamed to "Skill Sync"
- [ ] Multiple source types supported (GitHub, local)
- [ ] Central is Git repository with full history
- [ ] Commit history viewable with diffs
- [ ] Rollback to any commit
- [ ] Conflict detection during sync
- [ ] Interactive conflict resolution
- [ ] Push skills to individual agents
- [ ] Push skills to all agents
- [ ] Existing functionality preserved

---

## Dependency Order

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
          ↓                              ↓
          (Backend foundation)           (Frontend consumes backend)
```

Each task within a phase can be done sequentially. Phases 1-3 (backend) must complete before Phase 4 (frontend). Phase 5 requires both.

---

## Estimated Effort

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| Phase 0 | 2 | 30 min |
| Phase 1 | 6 | 3 hours |
| Phase 2 | 4 | 2 hours |
| Phase 3 | 1 | 30 min |
| Phase 4 | 7 | 4 hours |
| Phase 5 | 3 | 2 hours |
| **Total** | **23** | **~12 hours** |
