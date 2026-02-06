use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentConfig {
    pub name: String,
    pub id: String,
    pub enabled: bool,
    pub path: String,
    pub project_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub global_skills_path: String,
    pub agents: Vec<AgentConfig>,
    #[serde(default)]
    pub github_token: Option<String>,
    #[serde(default)]
    pub recent_projects: Vec<String>,
    #[serde(default)]
    pub active_projects: Vec<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            global_skills_path: "~/.agents/skills".to_string(),
            github_token: None,
            recent_projects: Vec::new(),
            active_projects: Vec::new(),
            agents: vec![
                AgentConfig {
                    name: "AdaL".to_string(),
                    id: "adal".to_string(),
                    enabled: false,
                    path: "~/.adal/skills/".to_string(),
                    project_path: ".adal/skills/".to_string(),
                },
                AgentConfig {
                    name: "Amp".to_string(),
                    id: "amp".to_string(),
                    enabled: false,
                    path: "~/.config/agents/skills/".to_string(),
                    project_path: ".agents/skills/".to_string(),
                },
                AgentConfig {
                    name: "Antigravity".to_string(),
                    id: "antigravity".to_string(),
                    enabled: false,
                    path: "~/.gemini/antigravity/skills/".to_string(),
                    project_path: ".agent/skills/".to_string(),
                },
                AgentConfig {
                    name: "Augment".to_string(),
                    id: "augment".to_string(),
                    enabled: false,
                    path: "~/.augment/skills/".to_string(),
                    project_path: ".augment/skills/".to_string(),
                },
                AgentConfig {
                    name: "Claude Code".to_string(),
                    id: "claude-code".to_string(),
                    enabled: true,
                    path: "~/.claude/skills/".to_string(),
                    project_path: ".claude/skills/".to_string(),
                },
                AgentConfig {
                    name: "Cline".to_string(),
                    id: "cline".to_string(),
                    enabled: true,
                    path: "~/.cline/skills/".to_string(),
                    project_path: ".cline/skills/".to_string(),
                },
                AgentConfig {
                    name: "CodeBuddy".to_string(),
                    id: "codebuddy".to_string(),
                    enabled: false,
                    path: "~/.codebuddy/skills/".to_string(),
                    project_path: ".codebuddy/skills/".to_string(),
                },
                AgentConfig {
                    name: "Codex".to_string(),
                    id: "codex".to_string(),
                    enabled: false,
                    path: "~/.codex/skills/".to_string(),
                    project_path: ".agents/skills/".to_string(),
                },
                AgentConfig {
                    name: "Command Code".to_string(),
                    id: "command-code".to_string(),
                    enabled: false,
                    path: "~/.commandcode/skills/".to_string(),
                    project_path: ".commandcode/skills/".to_string(),
                },
                AgentConfig {
                    name: "Continue".to_string(),
                    id: "continue".to_string(),
                    enabled: false,
                    path: "~/.continue/skills/".to_string(),
                    project_path: ".continue/skills/".to_string(),
                },
                AgentConfig {
                    name: "Crush".to_string(),
                    id: "crush".to_string(),
                    enabled: false,
                    path: "~/.config/crush/skills/".to_string(),
                    project_path: ".crush/skills/".to_string(),
                },
                AgentConfig {
                    name: "Cursor".to_string(),
                    id: "cursor".to_string(),
                    enabled: true,
                    path: "~/.cursor/skills/".to_string(),
                    project_path: ".cursor/skills/".to_string(),
                },
                AgentConfig {
                    name: "Droid".to_string(),
                    id: "droid".to_string(),
                    enabled: false,
                    path: "~/.factory/skills/".to_string(),
                    project_path: ".factory/skills/".to_string(),
                },
                AgentConfig {
                    name: "Gemini CLI".to_string(),
                    id: "gemini-cli".to_string(),
                    enabled: false,
                    path: "~/.gemini/skills/".to_string(),
                    project_path: ".agents/skills/".to_string(),
                },
                AgentConfig {
                    name: "GitHub Copilot".to_string(),
                    id: "github-copilot".to_string(),
                    enabled: false,
                    path: "~/.copilot/skills/".to_string(),
                    project_path: ".agents/skills/".to_string(),
                },
                AgentConfig {
                    name: "Goose".to_string(),
                    id: "goose".to_string(),
                    enabled: false,
                    path: "~/.config/goose/skills/".to_string(),
                    project_path: ".goose/skills/".to_string(),
                },
                AgentConfig {
                    name: "iFlow CLI".to_string(),
                    id: "iflow-cli".to_string(),
                    enabled: false,
                    path: "~/.iflow/skills/".to_string(),
                    project_path: ".iflow/skills/".to_string(),
                },
                AgentConfig {
                    name: "Junie".to_string(),
                    id: "junie".to_string(),
                    enabled: false,
                    path: "~/.junie/skills/".to_string(),
                    project_path: ".junie/skills/".to_string(),
                },
                AgentConfig {
                    name: "Kilo Code".to_string(),
                    id: "kilo".to_string(),
                    enabled: false,
                    path: "~/.kilocode/skills/".to_string(),
                    project_path: ".kilocode/skills/".to_string(),
                },
                AgentConfig {
                    name: "Kimi Code CLI".to_string(),
                    id: "kimi-cli".to_string(),
                    enabled: false,
                    path: "~/.config/agents/skills/".to_string(),
                    project_path: ".agents/skills/".to_string(),
                },
                AgentConfig {
                    name: "Kiro CLI".to_string(),
                    id: "kiro-cli".to_string(),
                    enabled: false,
                    path: "~/.kiro/skills/".to_string(),
                    project_path: ".kiro/skills/".to_string(),
                },
                AgentConfig {
                    name: "Kode".to_string(),
                    id: "kode".to_string(),
                    enabled: false,
                    path: "~/.kode/skills/".to_string(),
                    project_path: ".kode/skills/".to_string(),
                },
                AgentConfig {
                    name: "MCPJam".to_string(),
                    id: "mcpjam".to_string(),
                    enabled: false,
                    path: "~/.mcpjam/skills/".to_string(),
                    project_path: ".mcpjam/skills/".to_string(),
                },
                AgentConfig {
                    name: "Mistral Vibe".to_string(),
                    id: "mistral-vibe".to_string(),
                    enabled: false,
                    path: "~/.vibe/skills/".to_string(),
                    project_path: ".vibe/skills/".to_string(),
                },
                AgentConfig {
                    name: "Mux".to_string(),
                    id: "mux".to_string(),
                    enabled: false,
                    path: "~/.mux/skills/".to_string(),
                    project_path: ".mux/skills/".to_string(),
                },
                AgentConfig {
                    name: "Neovate".to_string(),
                    id: "neovate".to_string(),
                    enabled: false,
                    path: "~/.neovate/skills/".to_string(),
                    project_path: ".neovate/skills/".to_string(),
                },
                AgentConfig {
                    name: "OpenClaw".to_string(),
                    id: "openclaw".to_string(),
                    enabled: false,
                    path: "~/.moltbot/skills/".to_string(),
                    project_path: "skills/".to_string(),
                },
                AgentConfig {
                    name: "OpenCode".to_string(),
                    id: "opencode".to_string(),
                    enabled: true,
                    path: "~/.config/opencode/skills/".to_string(),
                    project_path: ".agents/skills/".to_string(),
                },
                AgentConfig {
                    name: "OpenHands".to_string(),
                    id: "openhands".to_string(),
                    enabled: false,
                    path: "~/.openhands/skills/".to_string(),
                    project_path: ".openhands/skills/".to_string(),
                },
                AgentConfig {
                    name: "Pi".to_string(),
                    id: "pi".to_string(),
                    enabled: false,
                    path: "~/.pi/agent/skills/".to_string(),
                    project_path: ".pi/skills/".to_string(),
                },
                AgentConfig {
                    name: "Pochi".to_string(),
                    id: "pochi".to_string(),
                    enabled: false,
                    path: "~/.pochi/skills/".to_string(),
                    project_path: ".pochi/skills/".to_string(),
                },
                AgentConfig {
                    name: "Qoder".to_string(),
                    id: "qoder".to_string(),
                    enabled: false,
                    path: "~/.qoder/skills/".to_string(),
                    project_path: ".qoder/skills/".to_string(),
                },
                AgentConfig {
                    name: "Qwen Code".to_string(),
                    id: "qwen-code".to_string(),
                    enabled: false,
                    path: "~/.qwen/skills/".to_string(),
                    project_path: ".qwen/skills/".to_string(),
                },
                AgentConfig {
                    name: "Replit".to_string(),
                    id: "replit".to_string(),
                    enabled: false,
                    path: "~/.config/agents/skills/".to_string(),
                    project_path: ".agents/skills/".to_string(),
                },
                AgentConfig {
                    name: "Roo Code".to_string(),
                    id: "roo".to_string(),
                    enabled: false,
                    path: "~/.roo/skills/".to_string(),
                    project_path: ".roo/skills/".to_string(),
                },
                AgentConfig {
                    name: "Trae".to_string(),
                    id: "trae".to_string(),
                    enabled: false,
                    path: "~/.trae/skills/".to_string(),
                    project_path: ".trae/skills/".to_string(),
                },
                AgentConfig {
                    name: "Trae CN".to_string(),
                    id: "trae-cn".to_string(),
                    enabled: false,
                    path: "~/.trae-cn/skills/".to_string(),
                    project_path: ".trae/skills/".to_string(),
                },
                AgentConfig {
                    name: "Windsurf".to_string(),
                    id: "windsurf".to_string(),
                    enabled: true,
                    path: "~/.codeium/windsurf/skills/".to_string(),
                    project_path: ".windsurf/skills/".to_string(),
                },
                AgentConfig {
                    name: "Zencoder".to_string(),
                    id: "zencoder".to_string(),
                    enabled: false,
                    path: "~/.zencoder/skills/".to_string(),
                    project_path: ".zencoder/skills/".to_string(),
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

#[tauri::command]
pub fn get_github_token() -> Result<Option<String>, String> {
    let settings = get_app_settings()?;
    Ok(settings.github_token)
}

#[tauri::command]
pub fn save_github_token(token: String) -> Result<(), String> {
    let mut settings = get_app_settings()?;
    settings.github_token = if token.is_empty() { None } else { Some(token) };
    save_app_settings(settings)
}
