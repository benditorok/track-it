use crate::domains::tracker::domain::model::{
    TrackerEntry, TrackerEntryLine, TrackerEntryLineDuration,
};
use sqlx::SqlitePool;
use std::future::Future;
use std::pin::Pin;

pub trait TrackerRepositoryTrait {
    /* Tracker entries */
    fn create_entry(
        &self,
        pool: SqlitePool,
        entry: TrackerEntry,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<TrackerEntry>> + Send + '_>>;

    fn get_entry(
        &self,
        pool: SqlitePool,
        id: i64,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<Option<TrackerEntry>>> + Send + '_>>;

    fn get_all_entries(
        &self,
        pool: SqlitePool,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<Vec<TrackerEntry>>> + Send + '_>>;

    fn update_entry(
        &self,
        pool: SqlitePool,
        entry: TrackerEntry,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<TrackerEntry>> + Send + '_>>;

    fn delete_entry(
        &self,
        pool: SqlitePool,
        entry: TrackerEntry,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<()>> + Send + '_>>;

    fn create_entry_line(
        &self,
        pool: SqlitePool,
        line: TrackerEntryLine,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<TrackerEntryLine>> + Send + '_>>;

    fn get_entry_line(
        &self,
        pool: SqlitePool,
        id: i64,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<Option<TrackerEntryLine>>> + Send + '_>>;

    fn get_all_entry_lines(
        &self,
        pool: SqlitePool,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<Vec<TrackerEntryLine>>> + Send + '_>>;

    fn get_lines_for_entry(
        &self,
        pool: SqlitePool,
        entry: TrackerEntry,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<Vec<TrackerEntryLine>>> + Send + '_>>;

    fn update_entry_line(
        &self,
        pool: SqlitePool,
        line: TrackerEntryLine,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<TrackerEntryLine>> + Send + '_>>;

    fn delete_entry_line(
        &self,
        pool: SqlitePool,
        line: TrackerEntryLine,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<()>> + Send + '_>>;

    fn delete_lines_for_entry(
        &self,
        pool: SqlitePool,
        entry: TrackerEntry,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<()>> + Send + '_>>;

    fn create_line_duration(
        &self,
        pool: SqlitePool,
        duration: TrackerEntryLineDuration,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<TrackerEntryLineDuration>> + Send + '_>>;

    fn get_line_durations(
        &self,
        pool: SqlitePool,
        line: TrackerEntryLine,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<Vec<TrackerEntryLineDuration>>> + Send + '_>>;

    fn update_line_duration(
        &self,
        pool: SqlitePool,
        duration: TrackerEntryLineDuration,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<TrackerEntryLineDuration>> + Send + '_>>;

    fn delete_line_duration(
        &self,
        pool: SqlitePool,
        duration: TrackerEntryLineDuration,
    ) -> Pin<Box<dyn Future<Output = sqlx::Result<()>> + Send + '_>>;
}
