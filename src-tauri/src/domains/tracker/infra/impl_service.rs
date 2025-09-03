use sqlx::SqlitePool;
use std::sync::Arc;

use crate::{
    domains::tracker::{
        TrackerEntry, TrackerEntryLine, TrackerRepositoryTrait, TrackerServiceTrait,
        dto::tracker_dto::{TrackerEntryCreateDto, TrackerEntryViewDto, TrackerEntryLineViewDto, TrackerEntryLineCreateDto, TrackerEntryLineUpdateDto, TrackerEntryLineDeleteDto, TrackerEntryDeleteDto}, infra::impl_repository::TrackerRepository,
    },
    error::AppError,
};
pub struct TrackerService {
    pool: SqlitePool,
    repo: Arc<dyn TrackerRepositoryTrait + Send + Sync>,
}

impl TrackerServiceTrait for TrackerService {
    fn create_service(pool: sqlx::SqlitePool) -> std::sync::Arc<dyn TrackerServiceTrait>
    where
        Self: Sized,
    {
        Arc::new(Self {
            pool,
            repo: Arc::new(TrackerRepository {}),
        })
    }

    fn create_tracker(
        &self,
        dto: TrackerEntryCreateDto,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<TrackerEntryViewDto, AppError>> + Send + '_>>
    {
        Box::pin(async move {
            let entry = TrackerEntry {
                label: dto.label,
                ..Default::default()
            };

            let created = self.repo.create_entry(self.pool.clone(), entry).await?;

            Ok(created.into())
        })
    }

    fn get_trackers(
        &self,
    ) -> std::pin::Pin<
        Box<dyn Future<Output = Result<Vec<TrackerEntryViewDto>, AppError>> + Send + '_>,
    > {
        Box::pin(async move {
            let entries = self.repo.get_entries(self.pool.clone()).await?;

            let dtos: Vec<TrackerEntryViewDto> =
                entries.into_iter().map(TrackerEntryViewDto::from).collect();

            Ok(dtos)
        })
    }

    fn get_tracker_lines(
        &self,
    ) -> std::pin::Pin<
        Box<dyn Future<Output = Result<Vec<TrackerEntryLineViewDto>, AppError>> + Send + '_>,
    > {
        Box::pin(async move {
            let lines = self.repo.get_entry_lines(self.pool.clone()).await?;

            let dtos: Vec<TrackerEntryLineViewDto> = lines
                .into_iter()
                .map(TrackerEntryLineViewDto::from)
                .collect();

            Ok(dtos)
        })
    }

    fn start_tracking(
        &self,
        dto: TrackerEntryLineCreateDto,
    ) -> std::pin::Pin<
        Box<dyn Future<Output = Result<TrackerEntryLineViewDto, AppError>> + Send + '_>,
    > {
        Box::pin(async move {
            let line = TrackerEntryLine::new(0, dto.entry_id, dto.desc, dto.started_at, None);

            let created = self.repo.create_entry_line(self.pool.clone(), line).await?;

            Ok(created.into())
        })
    }

    fn update_tracked(
        &self,
        dto: TrackerEntryLineUpdateDto,
    ) -> std::pin::Pin<
        Box<dyn Future<Output = Result<TrackerEntryLineViewDto, AppError>> + Send + '_>,
    > {
        Box::pin(async move {
            let line =
                TrackerEntryLine::new(dto.id, dto.entry_id, dto.desc, dto.started_at, dto.ended_at);

            let updated = self.repo.update_entry_line(self.pool.clone(), line).await?;

            Ok(updated.into())
        })
    }

    fn remove_tracked(
        &self,
        dto: TrackerEntryLineDeleteDto,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<(), AppError>> + Send + '_>> {
        Box::pin(async move {
            self.repo
                .delete_entry_line(self.pool.clone(), dto.id)
                .await?;

            Ok(())
        })
    }

    fn delete_tracker(
        &self,
        dto: TrackerEntryDeleteDto,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<(), AppError>> + Send + '_>> {
        Box::pin(async move {
            self.repo
                .delete_lines_for_entry(self.pool.clone(), dto.id)
                .await?;

            self.repo.delete_entry(self.pool.clone(), dto.id).await?;

            Ok(())
        })
    }
}
