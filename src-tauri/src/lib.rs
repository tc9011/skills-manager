mod commands;

use commands::settings::{
    get_app_settings, get_github_token, save_app_settings, save_github_token,
};
use commands::skills::{
    copy_skill, create_skill_file, delete_skill_directory, detect_installed_agents,
    get_skill_content, run_skills_add, run_skills_remove, scan_global_skills, scan_project_skills,
    symlink_skill,
};
use commands::sync::{
    check_skills_folder_exists, get_git_remote, get_sync_config, git_add_commit_push,
    git_clone_repo, git_init_repo, git_pull, git_push, git_status, is_git_repo, save_sync_config,
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
            check_skills_folder_exists,
            get_app_settings,
            save_app_settings,
            get_github_token,
            save_github_token,
            copy_skill,
            symlink_skill,
            create_skill_file,
            detect_installed_agents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
