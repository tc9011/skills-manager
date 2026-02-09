use git2::build::RepoBuilder;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
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
        path: Option<String>,
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
        url: String,
    },
}

impl SkillSource {
    pub fn id(&self) -> &str {
        match self {
            SkillSource::GitHub { id, .. } => id,
            SkillSource::Local { id, .. } => id,
            SkillSource::Registry { id, .. } => id,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SourceConfig {
    pub sources: Vec<SkillSource>,
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
    pub conflict_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum ConflictResolution {
    KeepCentral,
    UseSource,
}

fn get_sources_config_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let config_dir = home.join(".config").join("skill-sync");
    fs::create_dir_all(&config_dir).map_err(|e| format!("Failed to create config dir: {}", e))?;
    Ok(config_dir.join("sources.json"))
}

fn get_central_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home.join(".agents").join("skills"))
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

fn save_sources(sources: Vec<SkillSource>) -> Result<(), String> {
    let path = get_sources_config_path()?;
    let config = SourceConfig { sources };
    let content =
        serde_json::to_string_pretty(&config).map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write: {}", e))
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
    let filtered: Vec<_> = sources
        .into_iter()
        .filter(|s| s.id() != source_id)
        .collect();
    save_sources(filtered)
}

#[tauri::command]
pub fn sync_from_source(
    source_id: String,
    github_token: Option<String>,
) -> Result<SyncResult, String> {
    let sources = get_sources()?;
    let source = sources
        .iter()
        .find(|s| s.id() == source_id)
        .ok_or("Source not found")?;

    match source {
        SkillSource::GitHub {
            repo_url,
            branch,
            path,
            ..
        } => sync_from_github(repo_url, branch, path.as_deref(), github_token),
        SkillSource::Local { path, .. } => sync_from_local(path),
        SkillSource::Registry { .. } => Err("Registry sync not yet implemented".to_string()),
    }
}

fn sync_from_github(
    repo_url: &str,
    branch: &str,
    subpath: Option<&str>,
    github_token: Option<String>,
) -> Result<SyncResult, String> {
    let temp_dir = std::env::temp_dir().join(format!("skill-sync-{}", uuid::Uuid::new_v4()));

    let mut builder = RepoBuilder::new();
    builder.branch(branch);

    if let Some(token) = github_token {
        let mut callbacks = git2::RemoteCallbacks::new();
        callbacks.credentials(move |_url, _username_from_url, _allowed_types| {
            git2::Cred::userpass_plaintext(&token, "")
        });

        let mut fetch_options = git2::FetchOptions::new();
        fetch_options.remote_callbacks(callbacks);
        builder.fetch_options(fetch_options);
    }

    builder
        .clone(repo_url, &temp_dir)
        .map_err(|e| format!("Failed to clone: {}", e))?;

    let source_dir = match subpath {
        Some(p) => temp_dir.join(p),
        None => temp_dir.clone(),
    };

    let central = get_central_path()?;
    fs::create_dir_all(&central).map_err(|e| format!("Failed to create central: {}", e))?;

    let mut synced = Vec::new();
    let mut conflicts = Vec::new();

    if let Ok(entries) = fs::read_dir(&source_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() && path.join("SKILL.md").exists() {
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                let dest = central.join(&name);

                if let Some(conflict) = detect_conflict(&path, &dest) {
                    conflicts.push(conflict);
                } else {
                    copy_dir_all(&path, &dest)?;
                    synced.push(name);
                }
            }
        }
    }

    let _ = fs::remove_dir_all(&temp_dir);

    let message = if conflicts.is_empty() {
        format!("Synced {} skills", synced.len())
    } else {
        format!(
            "Synced {} skills, {} conflicts",
            synced.len(),
            conflicts.len()
        )
    };

    Ok(SyncResult {
        success: true,
        skills_synced: synced,
        conflicts,
        message,
    })
}

fn sync_from_local(source_path: &str) -> Result<SyncResult, String> {
    let source = PathBuf::from(source_path);
    if !source.exists() {
        return Err("Source directory does not exist".to_string());
    }

    let central = get_central_path()?;
    fs::create_dir_all(&central).map_err(|e| format!("Failed to create central: {}", e))?;

    let mut synced = Vec::new();
    let mut conflicts = Vec::new();

    if let Ok(entries) = fs::read_dir(&source) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() && path.join("SKILL.md").exists() {
                let name = path.file_name().unwrap().to_string_lossy().to_string();
                let dest = central.join(&name);

                if let Some(conflict) = detect_conflict(&path, &dest) {
                    conflicts.push(conflict);
                } else {
                    copy_dir_all(&path, &dest)?;
                    synced.push(name);
                }
            }
        }
    }

    let message = if conflicts.is_empty() {
        format!("Synced {} skills", synced.len())
    } else {
        format!(
            "Synced {} skills, {} conflicts",
            synced.len(),
            conflicts.len()
        )
    };

    Ok(SyncResult {
        success: true,
        skills_synced: synced,
        conflicts,
        message,
    })
}

fn detect_conflict(source_path: &PathBuf, dest_path: &PathBuf) -> Option<ConflictInfo> {
    if !dest_path.exists() {
        return None;
    }

    let source_skill = source_path.join("SKILL.md");
    let dest_skill = dest_path.join("SKILL.md");

    if !source_skill.exists() || !dest_skill.exists() {
        return None;
    }

    let source_content = fs::read_to_string(&source_skill).unwrap_or_default();
    let dest_content = fs::read_to_string(&dest_skill).unwrap_or_default();

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
    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    format!("{:x}", hasher.finish())[..8].to_string()
}

fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("Failed to create dir: {}", e))?;

    for entry in fs::read_dir(src).map_err(|e| format!("Failed to read dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let ty = entry
            .file_type()
            .map_err(|e| format!("Failed to get type: {}", e))?;
        let dest_path = dst.join(entry.file_name());

        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dest_path)?;
        } else {
            fs::copy(entry.path(), dest_path).map_err(|e| format!("Failed to copy: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn resolve_conflict(
    skill_name: String,
    source_id: String,
    resolution: ConflictResolution,
) -> Result<(), String> {
    match resolution {
        ConflictResolution::KeepCentral => Ok(()),
        ConflictResolution::UseSource => force_sync_skill(&skill_name, &source_id),
    }
}

fn force_sync_skill(skill_name: &str, source_id: &str) -> Result<(), String> {
    let sources = get_sources()?;
    let source = sources
        .iter()
        .find(|s| s.id() == source_id)
        .ok_or("Source not found")?;

    let central = get_central_path()?;
    let dest = central.join(skill_name);

    match source {
        SkillSource::GitHub {
            repo_url,
            branch,
            path,
            ..
        } => {
            let temp_dir =
                std::env::temp_dir().join(format!("skill-sync-{}", uuid::Uuid::new_v4()));

            let mut builder = RepoBuilder::new();
            builder.branch(branch);
            builder
                .clone(repo_url, &temp_dir)
                .map_err(|e| format!("Failed to clone: {}", e))?;

            let source_dir = match path {
                Some(p) => temp_dir.join(p),
                None => temp_dir.clone(),
            };

            let skill_src = source_dir.join(skill_name);
            if skill_src.exists() {
                if dest.exists() {
                    fs::remove_dir_all(&dest).map_err(|e| format!("Failed to remove: {}", e))?;
                }
                copy_dir_all(&skill_src, &dest)?;
            }

            let _ = fs::remove_dir_all(&temp_dir);
            Ok(())
        }
        SkillSource::Local { path, .. } => {
            let skill_src = PathBuf::from(path).join(skill_name);
            if skill_src.exists() {
                if dest.exists() {
                    fs::remove_dir_all(&dest).map_err(|e| format!("Failed to remove: {}", e))?;
                }
                copy_dir_all(&skill_src, &dest)?;
            }
            Ok(())
        }
        SkillSource::Registry { .. } => Err("Registry not supported".to_string()),
    }
}
