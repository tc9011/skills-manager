use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentConfig {
    pub name: String,
    pub id: String,
    pub enabled: bool,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub global_skills_path: String,
    pub agents: Vec<AgentConfig>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            global_skills_path: "~/.agents/skills".to_string(),
            agents: vec![
                AgentConfig {
                    name: "OpenCode".to_string(),
                    id: "opencode".to_string(),
                    enabled: true,
                    path: "~/.config/opencode/skills".to_string(),
                },
                AgentConfig {
                    name: "Claude Code".to_string(),
                    id: "claude".to_string(),
                    enabled: true,
                    path: "~/.claude/skills".to_string(),
                },
                AgentConfig {
                    name: "Cursor".to_string(),
                    id: "cursor".to_string(),
                    enabled: true,
                    path: "~/.cursor/skills".to_string(),
                },
            ],
        }
    }
}

fn get_settings_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not find home directory")?;
    let config_dir = home.join(".config").join("skills-manager");
    fs::create_dir_all(&config_dir).map_err(|e| format!("Failed to create config dir: {}", e))?;
    Ok(config_dir.join("settings.json"))
}

#[tauri::command]
pub fn get_app_settings() -> Result<AppSettings, String> {
    let settings_path = get_settings_path()?;

    if !settings_path.exists() {
        return Ok(AppSettings::default());
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse settings: {}", e))
}

#[tauri::command]
pub fn save_app_settings(settings: AppSettings) -> Result<(), String> {
    let settings_path = get_settings_path()?;
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&settings_path, content).map_err(|e| format!("Failed to write settings: {}", e))
}
