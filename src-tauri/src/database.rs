use sqlx::{migrate::MigrateDatabase as _, sqlite::SqliteConnectOptions, Sqlite, SqlitePool};
use std::env;

pub async fn initialize_database() -> Result<SqlitePool, Box<dyn std::error::Error + Send + Sync>> {
    let (database_url, database_file_path) = get_database_path()?;

    // Check if database exists, if not create it
    if !Sqlite::database_exists(&database_url).await? {
        log::info!("Creating database at: {database_file_path}",);
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

fn get_database_path() -> Result<(String, String), Box<dyn std::error::Error + Send + Sync>> {
    // Get the directory where the executable is located
    let exe_path = env::current_exe()?;
    let exe_dir = exe_path
        .parent()
        .ok_or("Could not determine executable directory")?;

    // Create the database path next to the executable
    let db_path = exe_dir.join("trackers.db");

    // Convert to string
    let db_file_path = db_path.to_string_lossy().to_string();

    // Create URL format for SQLite
    let db_url = format!("sqlite://{db_file_path}",);

    Ok((db_url, db_file_path))
}
