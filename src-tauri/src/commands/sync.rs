use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SyncConfig {
    pub repo_url: Option<String>,
    pub branch: String,
    pub auto_sync: bool,
    pub last_sync: Option<String>,
}

fn get_config_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let config_dir = home.join(".config").join("skills-manager");
    fs::create_dir_all(&config_dir).map_err(|e| format!("Failed to create config dir: {}", e))?;
    Ok(config_dir.join("config.json"))
}

fn get_skills_repo_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home.join(".agents").join("skills"))
}

#[tauri::command]
pub fn get_sync_config() -> Result<SyncConfig, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(SyncConfig {
            branch: "main".to_string(),
            ..Default::default()
        });
    }

    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))
}

#[tauri::command]
pub fn save_sync_config(config: SyncConfig) -> Result<(), String> {
    let config_path = get_config_path()?;
    let content =
        serde_json::to_string_pretty(&config).map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&config_path, content).map_err(|e| format!("Failed to write config: {}", e))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitResult {
    pub success: bool,
    pub message: String,
}

fn run_git_command(args: &[&str], cwd: &PathBuf) -> Result<GitResult, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(GitResult {
        success: output.status.success(),
        message: if output.status.success() {
            stdout
        } else {
            stderr
        },
    })
}

#[tauri::command]
pub fn git_status() -> Result<GitResult, String> {
    let skills_path = get_skills_repo_path()?;

    if !skills_path.join(".git").exists() {
        return Ok(GitResult {
            success: false,
            message: "Skills directory is not a git repository".to_string(),
        });
    }

    run_git_command(&["status", "--porcelain"], &skills_path)
}

#[tauri::command]
pub fn git_init_repo(repo_url: String, branch: String) -> Result<GitResult, String> {
    let skills_path = get_skills_repo_path()?;

    if skills_path.join(".git").exists() {
        return Err("Skills directory is already a git repository".to_string());
    }

    fs::create_dir_all(&skills_path).map_err(|e| format!("Failed to create skills dir: {}", e))?;

    run_git_command(&["init"], &skills_path)?;
    run_git_command(&["remote", "add", "origin", &repo_url], &skills_path)?;
    run_git_command(&["fetch", "origin"], &skills_path)?;

    let checkout_result = run_git_command(&["checkout", &branch], &skills_path);

    if checkout_result.is_err() || !checkout_result.as_ref().unwrap().success {
        run_git_command(&["checkout", "-b", &branch], &skills_path)?;
    }

    Ok(GitResult {
        success: true,
        message: format!("Repository initialized with remote: {}", repo_url),
    })
}

#[tauri::command]
pub fn git_clone_repo(repo_url: String, branch: String) -> Result<GitResult, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let agents_dir = home.join(".agents");

    fs::create_dir_all(&agents_dir).map_err(|e| format!("Failed to create .agents dir: {}", e))?;

    let skills_path = agents_dir.join("skills");

    if skills_path.exists() {
        return Err("Skills directory already exists. Use git pull to update.".to_string());
    }

    let output = Command::new("git")
        .args(["clone", "--branch", &branch, &repo_url, "skills"])
        .current_dir(&agents_dir)
        .output()
        .map_err(|e| format!("Failed to execute git clone: {}", e))?;

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(GitResult {
        success: output.status.success(),
        message: if output.status.success() {
            format!("Cloned {} to ~/.agents/skills", repo_url)
        } else {
            stderr
        },
    })
}

#[tauri::command]
pub fn git_pull() -> Result<GitResult, String> {
    let skills_path = get_skills_repo_path()?;

    if !skills_path.join(".git").exists() {
        return Err("Skills directory is not a git repository".to_string());
    }

    run_git_command(&["pull", "--rebase"], &skills_path)
}

#[tauri::command]
pub fn git_push() -> Result<GitResult, String> {
    let skills_path = get_skills_repo_path()?;

    if !skills_path.join(".git").exists() {
        return Err("Skills directory is not a git repository".to_string());
    }

    run_git_command(&["push"], &skills_path)
}

#[tauri::command]
pub fn git_add_commit_push(message: String) -> Result<GitResult, String> {
    let skills_path = get_skills_repo_path()?;

    if !skills_path.join(".git").exists() {
        return Err("Skills directory is not a git repository".to_string());
    }

    run_git_command(&["add", "."], &skills_path)?;

    let status = run_git_command(&["status", "--porcelain"], &skills_path)?;
    if status.message.trim().is_empty() {
        return Ok(GitResult {
            success: true,
            message: "No changes to commit".to_string(),
        });
    }

    run_git_command(&["commit", "-m", &message], &skills_path)?;
    run_git_command(&["push"], &skills_path)
}

#[tauri::command]
pub fn is_git_repo() -> Result<bool, String> {
    let skills_path = get_skills_repo_path()?;
    Ok(skills_path.join(".git").exists())
}

#[tauri::command]
pub fn get_git_remote() -> Result<Option<String>, String> {
    let skills_path = get_skills_repo_path()?;

    if !skills_path.join(".git").exists() {
        return Ok(None);
    }

    let result = run_git_command(&["remote", "get-url", "origin"], &skills_path)?;

    if result.success {
        Ok(Some(result.message.trim().to_string()))
    } else {
        Ok(None)
    }
}
