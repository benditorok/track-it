mod app;
mod database;
mod domains;
mod error;

use app::{
    AppState, create_tracker, delete_tracker, delete_tracker_line, get_trackers, initialize_app,
    resume_tracking, start_tracking, stop_all_active_tracking, stop_tracking, truncate_tables,
};
use tauri::Manager;

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
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // Handle app exit event to automatically stop all active tracking sessions
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let handle = app_handle.clone();
                tauri::async_runtime::block_on(async move {
                    let state: tauri::State<AppState> = handle.state();

                    // Use the existing stop_all_active_tracking logic
                    match stop_all_active_tracking(state).await {
                        Ok(stopped_lines) => {
                            log::info!(
                                "Stopped {} active tracking sessions on app exit",
                                stopped_lines.len()
                            );
                        }
                        Err(e) => {
                            log::error!("Failed to stop active tracking on app exit: {}", e);
                        }
                    }
                });
            }
        });
}
