use sqlx::{Sqlite, SqlitePool, migrate::MigrateDatabase as _, sqlite::SqliteConnectOptions};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub async fn initialize_database(
    app_handle: &AppHandle,
) -> Result<SqlitePool, Box<dyn std::error::Error + Send + Sync>> {
    let (database_url, database_file_path) = get_database_path(app_handle)?;

    // Check if database exists, if not create it
    if !Sqlite::database_exists(&database_url).await? {
        log::info!("Creating database at: {}", database_file_path.display());
        Sqlite::create_database(&database_url).await?;
    }

    // Connect to the database
    let options = SqliteConnectOptions::new()
        .filename(&database_file_path)
        .create_if_missing(true);

    let pool = SqlitePool::connect_with(options).await?;

    // Run migrations
    log::info!("Running database migrations...");
    sqlx::migrate!("../migrations").run(&pool).await?;
    log::info!("Database migrations completed successfully");

    Ok(pool)
}

fn get_database_path(
    app_handle: &AppHandle,
) -> Result<(String, PathBuf), Box<dyn std::error::Error + Send + Sync>> {
    // Get the app data directory from Tauri
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Ensure the app data directory exists
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    // Create the database path in the app data directory
    let db_path = app_data_dir.join("trackers.db");

    // Create URL format for SQLite
    let db_url = format!("sqlite://{}", db_path.display());

    Ok((db_url, db_path))
}

pub async fn truncate_tables(
    pool: &SqlitePool,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Purge the database by deleting all data from tables in correct order
    log::info!("Truncating tables...");

    // Delete tables in correct order because of foreign key constraints
    sqlx::query("DELETE FROM tracker_entry_line_duration")
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM tracker_entry_line")
        .execute(pool)
        .await?;
    sqlx::query("DELETE FROM tracker_entry")
        .execute(pool)
        .await?;

    // Reset auto-increment counters
    sqlx::query(
        "DELETE FROM sqlite_sequence WHERE name IN ('tracker_entry', 'tracker_entry_line', 'tracker_entry_line_duration')",
    )
    .execute(pool)
    .await?;

    log::info!("Tables truncated successfully");

    Ok(())
}
