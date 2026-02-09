use git2::{DiffOptions, ObjectType, Oid, Repository, Signature, Sort, StatusOptions};
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
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffStats {
    pub files_changed: u32,
    pub insertions: u32,
    pub deletions: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiffResult {
    pub stats: DiffStats,
    pub summary: String,
}

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

#[tauri::command]
pub fn is_central_git_repo() -> Result<bool, String> {
    let path = get_central_path()?;
    Ok(path.join(".git").exists())
}

#[tauri::command]
pub fn get_repo_status() -> Result<Vec<FileStatus>, String> {
    let path = get_central_path()?;
    let repo = Repository::open(&path).map_err(|e| format!("Failed to open repo: {}", e))?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    opts.recurse_untracked_dirs(true);

    let statuses = repo
        .statuses(Some(&mut opts))
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

        if let Some(file_path) = entry.path() {
            result.push(FileStatus {
                path: file_path.to_string(),
                status: status_str.to_string(),
            });
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn create_commit(
    message: String,
    author_name: Option<String>,
    author_email: Option<String>,
) -> Result<CommitInfo, String> {
    let path = get_central_path()?;
    let repo = Repository::open(&path).map_err(|e| format!("Failed to open repo: {}", e))?;

    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {}", e))?;

    // Stage all changes
    index
        .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("Failed to add files: {}", e))?;
    index
        .write()
        .map_err(|e| format!("Failed to write index: {}", e))?;

    let tree_id = index
        .write_tree()
        .map_err(|e| format!("Failed to write tree: {}", e))?;
    let tree = repo
        .find_tree(tree_id)
        .map_err(|e| format!("Failed to find tree: {}", e))?;

    let name = author_name.unwrap_or_else(|| "Skill Sync".to_string());
    let email = author_email.unwrap_or_else(|| "sync@skills.local".to_string());
    let sig =
        Signature::now(&name, &email).map_err(|e| format!("Failed to create signature: {}", e))?;

    let parent_commit = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
    let parents: Vec<&git2::Commit> = parent_commit.iter().collect();

    let commit_id = repo
        .commit(Some("HEAD"), &sig, &sig, &message, &tree, &parents)
        .map_err(|e| format!("Failed to create commit: {}", e))?;

    let commit = repo
        .find_commit(commit_id)
        .map_err(|e| format!("Failed to find created commit: {}", e))?;

    Ok(CommitInfo {
        id: commit_id.to_string(),
        short_id: commit_id.to_string()[..7].to_string(),
        message,
        author: name,
        email,
        timestamp: commit.time().seconds(),
        files_changed: 0,
    })
}

#[tauri::command]
pub fn get_commit_history(
    limit: Option<u32>,
    skip: Option<u32>,
) -> Result<Vec<CommitInfo>, String> {
    let path = get_central_path()?;
    let repo = Repository::open(&path).map_err(|e| format!("Failed to open repo: {}", e))?;

    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return Ok(Vec::new()), // No commits yet
    };

    let head_commit = head
        .peel_to_commit()
        .map_err(|e| format!("Failed to get commit: {}", e))?;

    let mut revwalk = repo
        .revwalk()
        .map_err(|e| format!("Failed to create revwalk: {}", e))?;
    revwalk
        .push(head_commit.id())
        .map_err(|e| format!("Failed to push commit: {}", e))?;
    revwalk
        .set_sorting(Sort::TIME)
        .map_err(|e| format!("Failed to set sorting: {}", e))?;

    let skip_count = skip.unwrap_or(0) as usize;
    let limit_count = limit.unwrap_or(50) as usize;

    let commits: Vec<CommitInfo> = revwalk
        .skip(skip_count)
        .take(limit_count)
        .filter_map(|oid| oid.ok())
        .filter_map(|oid| repo.find_commit(oid).ok())
        .map(|commit| CommitInfo {
            id: commit.id().to_string(),
            short_id: commit.id().to_string()[..7].to_string(),
            message: commit.message().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            email: commit.author().email().unwrap_or("").to_string(),
            timestamp: commit.time().seconds(),
            files_changed: 0,
        })
        .collect();

    Ok(commits)
}

#[tauri::command]
pub fn get_working_diff() -> Result<DiffResult, String> {
    let path = get_central_path()?;
    let repo = Repository::open(&path).map_err(|e| format!("Failed to open repo: {}", e))?;

    let head_tree = repo
        .head()
        .ok()
        .and_then(|h| h.peel(ObjectType::Tree).ok())
        .and_then(|obj| obj.into_tree().ok());

    let mut opts = DiffOptions::new();
    opts.include_untracked(true);

    let diff = repo
        .diff_tree_to_workdir_with_index(head_tree.as_ref(), Some(&mut opts))
        .map_err(|e| format!("Failed to create diff: {}", e))?;

    let stats = diff
        .stats()
        .map_err(|e| format!("Failed to get stats: {}", e))?;

    let files_changed = stats.files_changed();
    let insertions = stats.insertions();
    let deletions = stats.deletions();

    let summary = format!(
        "{} file(s) changed, {} insertions(+), {} deletions(-)",
        files_changed, insertions, deletions
    );

    Ok(DiffResult {
        stats: DiffStats {
            files_changed: files_changed as u32,
            insertions: insertions as u32,
            deletions: deletions as u32,
        },
        summary,
    })
}

#[tauri::command]
pub fn checkout_commit(commit_id: String) -> Result<String, String> {
    let path = get_central_path()?;
    let repo = Repository::open(&path).map_err(|e| format!("Failed to open repo: {}", e))?;

    let oid = Oid::from_str(&commit_id).map_err(|e| format!("Invalid commit ID: {}", e))?;
    let commit = repo
        .find_commit(oid)
        .map_err(|e| format!("Commit not found: {}", e))?;

    let mut checkout_builder = git2::build::CheckoutBuilder::new();
    checkout_builder.force();

    repo.checkout_tree(commit.as_object(), Some(&mut checkout_builder))
        .map_err(|e| format!("Failed to checkout: {}", e))?;

    repo.set_head_detached(oid)
        .map_err(|e| format!("Failed to set HEAD: {}", e))?;

    Ok(format!(
        "Checked out commit {}",
        &commit_id[..7.min(commit_id.len())]
    ))
}
