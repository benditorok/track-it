use crate::database;
use crate::domains::tracker::{
    TrackerEntryCreateDto, TrackerEntryLineCreateDto, TrackerEntryLineUpdateDto,
    TrackerEntryLineViewDto, TrackerEntryViewDto, TrackerService, TrackerServiceTrait,
};
use chrono::Utc;
use sqlx::SqlitePool;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub db_pool: Arc<Mutex<Option<SqlitePool>>>,
    pub tracker_service: Arc<Mutex<Option<Arc<dyn TrackerServiceTrait>>>>,
}

#[tauri::command]
pub async fn initialize_app(app_handle: AppHandle) -> Result<String, String> {
    let state: State<AppState> = app_handle.state();

    match database::initialize_database(&app_handle).await {
        Ok(pool) => {
            let tracker_service = TrackerService::create_service(pool.clone());

            // Store the database pool and service in the app state
            {
                let mut db_pool = state.db_pool.lock().await;
                *db_pool = Some(pool);
            }
            {
                let mut service = state.tracker_service.lock().await;
                *service = Some(tracker_service);
            }

            log::info!("Database and services initialized successfully");
            Ok("Database initialized successfully".to_string())
        }
        Err(e) => {
            log::error!("Failed to initialize database: {}", e);
            Err(format!("Failed to initialize database: {}", e))
        }
    }
}

#[tauri::command]
pub async fn get_trackers(state: State<'_, AppState>) -> Result<Vec<TrackerEntryViewDto>, String> {
    let service_guard = state.tracker_service.lock().await;

    if let Some(service) = service_guard.as_ref() {
        service
            .get_trackers()
            .await
            .map_err(|e| format!("Failed to get trackers: {}", e))
    } else {
        Err("Service not initialized".to_string())
    }
}

#[tauri::command]
pub async fn create_tracker(
    label: String,
    state: State<'_, AppState>,
) -> Result<TrackerEntryViewDto, String> {
    let service_guard = state.tracker_service.lock().await;

    if let Some(service) = service_guard.as_ref() {
        let dto = TrackerEntryCreateDto {
            label,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        service
            .create_tracker(dto)
            .await
            .map_err(|e| format!("Failed to create tracker: {}", e))
    } else {
        Err("Service not initialized".to_string())
    }
}

#[tauri::command]
pub async fn get_tracker_lines(
    state: State<'_, AppState>,
) -> Result<Vec<TrackerEntryLineViewDto>, String> {
    let service_guard = state.tracker_service.lock().await;

    if let Some(service) = service_guard.as_ref() {
        service
            .get_tracker_lines()
            .await
            .map_err(|e| format!("Failed to get tracker lines: {}", e))
    } else {
        Err("Service not initialized".to_string())
    }
}

#[tauri::command]
pub async fn start_tracking(
    entry_id: i64,
    description: String,
    state: State<'_, AppState>,
) -> Result<TrackerEntryLineViewDto, String> {
    let service_guard = state.tracker_service.lock().await;

    if let Some(service) = service_guard.as_ref() {
        let dto = TrackerEntryLineCreateDto {
            entry_id,
            desc: description,
            started_at: Utc::now(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        service
            .start_tracking(dto)
            .await
            .map_err(|e| format!("Failed to start tracking: {}", e))
    } else {
        Err("Service not initialized".to_string())
    }
}

#[tauri::command]
pub async fn stop_tracking(
    line_id: i64,
    entry_id: i64,
    description: String,
    started_at: String, // ISO string
    state: State<'_, AppState>,
) -> Result<TrackerEntryLineViewDto, String> {
    let service_guard = state.tracker_service.lock().await;

    if let Some(service) = service_guard.as_ref() {
        let started_at_parsed = chrono::DateTime::parse_from_rfc3339(&started_at)
            .map_err(|e| format!("Invalid date format: {}", e))?
            .with_timezone(&Utc);

        let dto = TrackerEntryLineUpdateDto {
            id: line_id,
            entry_id,
            desc: description,
            started_at: started_at_parsed,
            ended_at: Some(Utc::now()),
            updated_at: Utc::now(),
        };

        service
            .update_tracked(dto)
            .await
            .map_err(|e| format!("Failed to stop tracking: {}", e))
    } else {
        Err("Service not initialized".to_string())
    }
}

#[tauri::command]
pub async fn delete_tracker(tracker_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let service_guard = state.tracker_service.lock().await;

    if let Some(service) = service_guard.as_ref() {
        use crate::domains::tracker::TrackerEntryDeleteDto;

        let dto = TrackerEntryDeleteDto { id: tracker_id };

        service
            .delete_tracker(dto)
            .await
            .map_err(|e| format!("Failed to delete tracker: {}", e))
    } else {
        Err("Service not initialized".to_string())
    }
}

#[tauri::command]
pub async fn delete_tracker_line(line_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    let service_guard = state.tracker_service.lock().await;

    if let Some(service) = service_guard.as_ref() {
        use crate::domains::tracker::TrackerEntryLineDeleteDto;

        let dto = TrackerEntryLineDeleteDto { id: line_id };

        service
            .remove_tracked(dto)
            .await
            .map_err(|e| format!("Failed to delete tracker line: {}", e))
    } else {
        Err("Service not initialized".to_string())
    }
}
