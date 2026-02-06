mod commands;

use commands::settings::{get_app_settings, save_app_settings};
use commands::skills::{
    delete_skill_directory, get_skill_content, run_skills_add, run_skills_remove,
    scan_global_skills, scan_project_skills,
};
use commands::sync::{
    get_git_remote, get_sync_config, git_add_commit_push, git_clone_repo, git_init_repo, git_pull,
    git_push, git_status, is_git_repo, save_sync_config,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_global_skills,
            scan_project_skills,
            get_skill_content,
            run_skills_add,
            run_skills_remove,
            delete_skill_directory,
            get_sync_config,
            save_sync_config,
            git_status,
            git_init_repo,
            git_clone_repo,
            git_pull,
            git_push,
            git_add_commit_push,
            is_git_repo,
            get_git_remote,
            get_app_settings,
            save_app_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
