use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

use super::settings::get_app_settings;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Skill {
    pub name: String,
    pub description: String,
    pub path: String,
    pub source: SkillSource,
    pub installed_in: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum SkillSource {
    Local,
    Remote,
    Symlink,
}

fn get_home_dir() -> Option<PathBuf> {
    dirs::home_dir()
}

fn parse_skill_frontmatter(content: &str) -> Option<(String, String)> {
    if !content.starts_with("---") {
        return None;
    }

    let parts: Vec<&str> = content.splitn(3, "---").collect();
    if parts.len() < 3 {
        return None;
    }

    let frontmatter = parts[1].trim();
    let mut name = None;
    let mut description = None;

    for line in frontmatter.lines() {
        let line = line.trim();
        if let Some(value) = line.strip_prefix("name:") {
            name = Some(value.trim().trim_matches('"').to_string());
        } else if let Some(value) = line.strip_prefix("description:") {
            description = Some(value.trim().trim_matches('"').to_string());
        }
    }

    match (name, description) {
        (Some(n), Some(d)) => Some((n, d)),
        (Some(n), None) => Some((n, String::new())),
        _ => None,
    }
}

fn scan_skills_in_directory(dir: &PathBuf) -> Vec<(String, String, String)> {
    let mut skills = Vec::new();

    if !dir.exists() {
        return skills;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let skill_md = path.join("SKILL.md");
                if skill_md.exists() {
                    if let Ok(content) = fs::read_to_string(&skill_md) {
                        if let Some((name, description)) = parse_skill_frontmatter(&content) {
                            skills.push((name, description, path.to_string_lossy().to_string()));
                        }
                    }
                }
            }
        }
    }

    skills
}

#[tauri::command]
pub fn scan_global_skills() -> Result<Vec<Skill>, String> {
    let home = get_home_dir().ok_or("Could not find home directory")?;

    let agents_skills = home.join(".agents").join("skills");
    let canonical_skills = scan_skills_in_directory(&agents_skills);

    let settings = get_app_settings().unwrap_or_default();

    let mut agent_skill_presence: HashMap<String, Vec<String>> = HashMap::new();

    for agent in &settings.agents {
        let agent_skill_dir = if agent.path.starts_with("~/") {
            home.join(&agent.path[2..])
        } else {
            PathBuf::from(&agent.path)
        };

        if agent_skill_dir.exists() {
            if let Ok(entries) = fs::read_dir(&agent_skill_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let skill_name = path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .map(|s| s.to_string());

                    if let Some(name) = skill_name {
                        agent_skill_presence
                            .entry(name)
                            .or_default()
                            .push(agent.id.clone());
                    }
                }
            }
        }
    }

    let mut skills: Vec<Skill> = canonical_skills
        .into_iter()
        .map(|(name, description, path)| {
            let installed_in = agent_skill_presence.get(&name).cloned().unwrap_or_default();

            let source = if PathBuf::from(&path).read_link().is_ok() {
                SkillSource::Symlink
            } else {
                SkillSource::Local
            };

            Skill {
                name,
                description,
                path,
                source,
                installed_in,
            }
        })
        .collect();

    skills.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(skills)
}

#[tauri::command]
pub fn get_skill_content(path: String) -> Result<String, String> {
    let skill_md = PathBuf::from(&path).join("SKILL.md");
    fs::read_to_string(&skill_md).map_err(|e| format!("Failed to read skill content: {}", e))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
}

#[tauri::command]
pub fn run_skills_add(skill_name: String) -> Result<CommandResult, String> {
    let output = Command::new("npx")
        .args(["skills", "add", &skill_name])
        .output()
        .map_err(|e| format!("Failed to execute npx skills add: {}", e))?;

    Ok(CommandResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[tauri::command]
pub fn run_skills_remove(skill_name: String) -> Result<CommandResult, String> {
    let output = Command::new("npx")
        .args(["skills", "remove", &skill_name])
        .output()
        .map_err(|e| format!("Failed to execute npx skills remove: {}", e))?;

    Ok(CommandResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[tauri::command]
pub fn delete_skill_directory(path: String) -> Result<(), String> {
    let skill_path = PathBuf::from(&path);
    if !skill_path.exists() {
        return Err("Skill directory does not exist".to_string());
    }

    let home = get_home_dir().ok_or("Could not find home directory")?;
    let agents_skills = home.join(".agents").join("skills");

    if !skill_path.starts_with(&agents_skills) {
        return Err("Cannot delete skills outside of ~/.agents/skills/".to_string());
    }

    fs::remove_dir_all(&skill_path).map_err(|e| format!("Failed to delete skill: {}", e))
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectSkill {
    pub name: String,
    pub description: String,
    pub path: String,
}

#[tauri::command]
pub fn scan_project_skills(project_path: String) -> Result<Vec<ProjectSkill>, String> {
    let project_dir = PathBuf::from(&project_path);

    if !project_dir.exists() {
        return Err("Project directory does not exist".to_string());
    }

    let mut skills = Vec::new();

    // Check common skill locations in a project
    let skill_dirs = vec![
        project_dir.join(".opencode").join("skill"),
        project_dir.join(".opencode").join("skills"),
        project_dir.join(".claude").join("skill"),
        project_dir.join(".claude").join("skills"),
        project_dir.join(".cursor").join("skill"),
        project_dir.join(".cursor").join("skills"),
        project_dir.join(".agents").join("skills"),
    ];

    for skill_dir in skill_dirs {
        if skill_dir.exists() && skill_dir.is_dir() {
            // Check if this dir itself contains SKILL.md
            let direct_skill = skill_dir.join("SKILL.md");
            if direct_skill.exists() {
                if let Ok(content) = fs::read_to_string(&direct_skill) {
                    if let Some((name, description)) = parse_skill_frontmatter(&content) {
                        skills.push(ProjectSkill {
                            name,
                            description,
                            path: skill_dir.to_string_lossy().to_string(),
                        });
                    }
                }
            }

            // Also scan subdirectories for skills
            if let Ok(entries) = fs::read_dir(&skill_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        let skill_md = path.join("SKILL.md");
                        if skill_md.exists() {
                            if let Ok(content) = fs::read_to_string(&skill_md) {
                                if let Some((name, description)) = parse_skill_frontmatter(&content)
                                {
                                    skills.push(ProjectSkill {
                                        name,
                                        description,
                                        path: path.to_string_lossy().to_string(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Deduplicate by path
    skills.sort_by(|a, b| a.path.cmp(&b.path));
    skills.dedup_by(|a, b| a.path == b.path);

    // Sort by name
    skills.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(skills)
}

fn copy_dir_recursively(src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
    if !src.exists() {
        return Err(format!("Source directory does not exist: {:?}", src));
    }

    fs::create_dir_all(dst)
        .map_err(|e| format!("Failed to create destination directory: {}", e))?;

    let entries =
        fs::read_dir(src).map_err(|e| format!("Failed to read source directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let src_path = entry.path();
        let file_name = entry.file_name();
        let dst_path = dst.join(&file_name);

        if src_path.is_dir() {
            copy_dir_recursively(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Failed to copy file {:?}: {}", file_name, e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn copy_skill(source_path: String, dest_dir: String) -> Result<String, String> {
    let src = PathBuf::from(&source_path);
    let dst_parent = PathBuf::from(&dest_dir);

    if !src.exists() {
        return Err("Source skill directory does not exist".to_string());
    }

    let skill_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid source path")?;

    let dst = dst_parent.join(skill_name);

    if dst.exists() {
        return Err(format!(
            "Skill '{}' already exists at destination. Delete it first to overwrite.",
            skill_name
        ));
    }

    fs::create_dir_all(&dst_parent)
        .map_err(|e| format!("Failed to create destination directory: {}", e))?;

    copy_dir_recursively(&src, &dst)?;

    Ok(dst.to_string_lossy().to_string())
}

#[tauri::command]
pub fn create_skill_file(
    skill_name: String,
    description: String,
    content: String,
) -> Result<String, String> {
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

#[cfg(unix)]
#[tauri::command]
pub fn symlink_skill(source_path: String, dest_dir: String) -> Result<String, String> {
    use std::os::unix::fs::symlink;

    let src = PathBuf::from(&source_path);
    let dst_parent = PathBuf::from(&dest_dir);

    if !src.exists() {
        return Err("Source skill directory does not exist".to_string());
    }

    let skill_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid source path")?;

    let dst = dst_parent.join(skill_name);

    if dst.exists() {
        return Err(format!(
            "Skill '{}' already exists at destination. Delete it first to create symlink.",
            skill_name
        ));
    }

    fs::create_dir_all(&dst_parent)
        .map_err(|e| format!("Failed to create destination directory: {}", e))?;

    symlink(&src, &dst).map_err(|e| format!("Failed to create symlink: {}", e))?;

    Ok(dst.to_string_lossy().to_string())
}

#[cfg(windows)]
#[tauri::command]
pub fn symlink_skill(source_path: String, dest_dir: String) -> Result<String, String> {
    use std::os::windows::fs::symlink_dir;

    let src = PathBuf::from(&source_path);
    let dst_parent = PathBuf::from(&dest_dir);

    if !src.exists() {
        return Err("Source skill directory does not exist".to_string());
    }

    let skill_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid source path")?;

    let dst = dst_parent.join(skill_name);

    if dst.exists() {
        return Err(format!(
            "Skill '{}' already exists at destination. Delete it first to create symlink.",
            skill_name
        ));
    }

    fs::create_dir_all(&dst_parent)
        .map_err(|e| format!("Failed to create destination directory: {}", e))?;

    symlink_dir(&src, &dst).map_err(|e| format!("Failed to create symlink: {}", e))?;

    Ok(dst.to_string_lossy().to_string())
}
