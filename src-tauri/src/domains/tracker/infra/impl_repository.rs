use crate::domains::tracker::{
    domain::model::{TrackerEntry, TrackerEntryLine},
    TrackerRepositoryTrait,
};
use sqlx::SqlitePool;
use std::future::Future;

pub struct TrackerRepository;

impl TrackerRepositoryTrait for TrackerRepository {
    fn create_entry(
        &self,
        pool: SqlitePool,
        entry: TrackerEntry,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<TrackerEntry>> + Send + '_>> {
        Box::pin(async move {
            let entry = sqlx::query_as::<_, TrackerEntry>(
                r#"
                INSERT INTO tracker_entry (label, created_at, updated_at, is_deleted)
                VALUES (?, ?, ?, ?)
                RETURNING id, label, created_at, updated_at, is_deleted"#,
            )
            .bind(&entry.label)
            .bind(entry.created_at)
            .bind(entry.updated_at)
            .bind(entry.is_deleted)
            .fetch_one(&pool)
            .await?;

            Ok(entry)
        })
    }

    fn get_entry(
        &self,
        pool: SqlitePool,
        id: i64,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<Option<TrackerEntry>>> + Send + '_>>
    {
        Box::pin(async move {
            let entry = sqlx::query_as::<_, TrackerEntry>(
                r#"
                SELECT id, label, created_at, updated_at, is_deleted
                FROM tracker_entry
                WHERE id = ? AND is_deleted = 0
                "#,
            )
            .bind(id)
            .fetch_optional(&pool)
            .await?;

            Ok(entry)
        })
    }

    fn get_entries(
        &self,
        pool: SqlitePool,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<Vec<TrackerEntry>>> + Send + '_>> {
        Box::pin(async move {
            let entries = sqlx::query_as::<_, TrackerEntry>(
                r#"
                SELECT id, label, created_at, updated_at, is_deleted
                FROM tracker_entry
                WHERE is_deleted = 0
                ORDER BY created_at DESC
                "#,
            )
            .fetch_all(&pool)
            .await?;

            Ok(entries)
        })
    }

    fn update_entry(
        &self,
        pool: SqlitePool,
        entry: TrackerEntry,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<TrackerEntry>> + Send + '_>> {
        Box::pin(async move {
            let entry = sqlx::query_as::<_, TrackerEntry>(
                r#"
                UPDATE tracker_entry
                SET label = ?, updated_at = ?
                WHERE id = ?
                RETURNING id, label, created_at, updated_at, is_deleted
                "#,
            )
            .bind(&entry.label)
            .bind(entry.updated_at)
            .bind(entry.id)
            .fetch_one(&pool)
            .await?;

            Ok(entry)
        })
    }

    fn delete_entry(
        &self,
        pool: SqlitePool,
        id: i64,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<()>> + Send + '_>> {
        Box::pin(async move {
            sqlx::query(
                r#"
                UPDATE tracker_entry
                SET is_deleted = 1
                WHERE id = ? AND is_deleted = 0
                "#,
            )
            .bind(id)
            .execute(&pool)
            .await?;

            Ok(())
        })
    }

    fn create_entry_line(
        &self,
        pool: SqlitePool,
        line: TrackerEntryLine,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<TrackerEntryLine>> + Send + '_>> {
        Box::pin(async move {
            let lines = sqlx::query_as::<_, TrackerEntryLine>(
                r#"
                INSERT INTO tracker_entry_line (entry_id, desc, started_at, ended_at, created_at, updated_at, is_deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                RETURNING id, entry_id, desc, started_at, ended_at, created_at, updated_at, is_deleted
                "#
            )
            .bind(line.entry_id)
            .bind(&line.desc)
            .bind(line.started_at)
            .bind(line.ended_at)
            .bind(line.created_at)
            .bind(line.updated_at)
            .bind(line.is_deleted)
            .fetch_one(&pool)
            .await?;

            Ok(lines)
        })
    }

    fn get_entry_line(
        &self,
        pool: SqlitePool,
        id: i64,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<Option<TrackerEntryLine>>> + Send + '_>>
    {
        Box::pin(async move {
            let line = sqlx::query_as::<_, TrackerEntryLine>(
                r#"
                SELECT id, entry_id, desc, started_at, ended_at, created_at, updated_at, is_deleted
                FROM tracker_entry_line
                WHERE id = ? AND is_deleted = 0
                "#,
            )
            .bind(id)
            .fetch_optional(&pool)
            .await?;

            Ok(line)
        })
    }

    fn get_entry_lines(
        &self,
        pool: SqlitePool,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<Vec<TrackerEntryLine>>> + Send + '_>>
    {
        Box::pin(async move {
            let lines = sqlx::query_as::<_, TrackerEntryLine>(
                r#"
                SELECT id, entry_id, desc, started_at, ended_at, created_at, updated_at, is_deleted
                FROM tracker_entry_line
                WHERE is_deleted = 0
                ORDER BY started_at DESC
                "#,
            )
            .fetch_all(&pool)
            .await?;

            Ok(lines)
        })
    }

    fn get_lines_for_entry(
        &self,
        pool: SqlitePool,
        entry_id: i64,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<Vec<TrackerEntryLine>>> + Send + '_>>
    {
        Box::pin(async move {
            let lines = sqlx::query_as::<_, TrackerEntryLine>(
                r#"
                SELECT id, entry_id, desc, started_at, ended_at, created_at, updated_at, is_deleted
                FROM tracker_entry_line
                WHERE entry_id = ? AND is_deleted = 0
                ORDER BY started_at DESC
                "#,
            )
            .bind(entry_id)
            .fetch_all(&pool)
            .await?;

            Ok(lines)
        })
    }

    fn update_entry_line(
        &self,
        pool: SqlitePool,
        line: TrackerEntryLine,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<TrackerEntryLine>> + Send + '_>> {
        Box::pin(async move {
            let line = sqlx::query_as::<_, TrackerEntryLine>(
                r#"
                UPDATE tracker_entry_line
                SET desc = ?, started_at = ?, ended_at = ?, updated_at = ?
                WHERE id = ?
                RETURNING id, entry_id, desc, started_at, ended_at, created_at, updated_at, is_deleted
                "#,
            )
            .bind(line.desc)
            .bind(line.started_at)
            .bind(line.ended_at)
            .bind(line.updated_at)
            .bind(line.id)
            .fetch_one(&pool)
            .await?;

            Ok(line)
        })
    }

    fn delete_entry_line(
        &self,
        pool: SqlitePool,
        id: i64,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<()>> + Send + '_>> {
        Box::pin(async move {
            sqlx::query(
                r#"
                UPDATE tracker_entry_line
                SET is_deleted = 1
                WHERE id = ? AND is_deleted = 0
                "#,
            )
            .bind(id)
            .execute(&pool)
            .await?;

            Ok(())
        })
    }

    fn delete_lines_for_entry(
        &self,
        pool: SqlitePool,
        entry_id: i64,
    ) -> std::pin::Pin<Box<dyn Future<Output = sqlx::Result<()>> + Send + '_>> {
        Box::pin(async move {
            sqlx::query(
                r#"
                UPDATE tracker_entry_line
                SET is_deleted = 1
                WHERE entry_id = ? AND is_deleted = 0
                "#,
            )
            .bind(entry_id)
            .execute(&pool)
            .await?;

            Ok(())
        })
    }
}
