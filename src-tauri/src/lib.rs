mod app;
mod database;
mod domains;
mod error;

use app::{
    AppState, create_tracker, delete_tracker, delete_tracker_line, get_trackers, initialize_app,
    resume_tracking, start_tracking, stop_all_active_tracking, stop_tracking, truncate_tables,
};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            initialize_app,
            get_trackers,
            create_tracker,
            start_tracking,
            stop_tracking,
            resume_tracking,
            delete_tracker,
            delete_tracker_line,
            truncate_tables,
            stop_all_active_tracking
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
