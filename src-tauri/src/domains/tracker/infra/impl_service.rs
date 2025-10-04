use crate::{
    domains::tracker::{
        TrackerEntry, TrackerEntryLine, TrackerEntryLineDuration, TrackerRepositoryTrait,
        TrackerServiceTrait,
        dto::tracker_dto::{
            TrackerEntryCreateDto, TrackerEntryDeleteDto, TrackerEntryLineCreateDto,
            TrackerEntryLineDeleteDto, TrackerEntryLineDurationViewDto, TrackerEntryLineUpdateDto,
            TrackerEntryLineViewDto, TrackerEntryViewDto,
        },
        infra::impl_repository::TrackerRepository,
    },
    error::AppError,
};
use chrono::Utc;
use sqlx::SqlitePool;
use std::{future::Future, sync::Arc};

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
            let entries = self.repo.get_all_entries(self.pool.clone()).await?;

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
            let lines = self.repo.get_all_entry_lines(self.pool.clone()).await?;

            let mut dtos: Vec<TrackerEntryLineViewDto> = Vec::new();

            for line in lines {
                let durations = self
                    .repo
                    .get_line_durations(self.pool.clone(), line.clone())
                    .await?;
                let duration_dtos: Vec<TrackerEntryLineDurationViewDto> = durations
                    .into_iter()
                    .map(TrackerEntryLineDurationViewDto::from)
                    .collect();

                let mut line_dto = TrackerEntryLineViewDto::from(line);
                line_dto.durations = duration_dtos;
                dtos.push(line_dto);
            }

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
            let line = TrackerEntryLine::new(0, dto.entry_id, dto.desc);

            let created_line = self.repo.create_entry_line(self.pool.clone(), line).await?;

            // Create initial duration entry
            let duration = TrackerEntryLineDuration::new(0, created_line.id, Utc::now(), None);

            let created_duration = self
                .repo
                .create_line_duration(self.pool.clone(), duration)
                .await?;

            let mut line_dto = TrackerEntryLineViewDto::from(created_line);
            line_dto.durations = vec![TrackerEntryLineDurationViewDto::from(created_duration)];

            Ok(line_dto)
        })
    }

    fn stop_tracking(
        &self,
        line_id: i64,
    ) -> std::pin::Pin<
        Box<dyn Future<Output = Result<TrackerEntryLineViewDto, AppError>> + Send + '_>,
    > {
        Box::pin(async move {
            // Get the line
            let line = self
                .repo
                .get_entry_line(self.pool.clone(), line_id)
                .await?
                .ok_or_else(|| AppError::NotFound(format!("Line with id {} not found", line_id)))?;

            // Get all durations for this line
            let durations = self
                .repo
                .get_line_durations(self.pool.clone(), line.clone())
                .await?;

            // Find the active duration (one without ended_at)
            if let Some(active_duration) = durations.iter().find(|d| d.ended_at.is_none()) {
                let mut updated_duration = active_duration.clone();
                updated_duration.ended_at = Some(Utc::now());
                updated_duration.updated_at = Utc::now();

                let updated = self
                    .repo
                    .update_line_duration(self.pool.clone(), updated_duration)
                    .await?;

                // Get all durations again to return complete data
                let all_durations = self
                    .repo
                    .get_line_durations(self.pool.clone(), line.clone())
                    .await?;
                let duration_dtos: Vec<TrackerEntryLineDurationViewDto> = all_durations
                    .into_iter()
                    .map(TrackerEntryLineDurationViewDto::from)
                    .collect();

                let mut line_dto = TrackerEntryLineViewDto::from(line);
                line_dto.durations = duration_dtos;

                Ok(line_dto)
            } else {
                Err(AppError::ValidationError(
                    "No active duration found for this line".to_string(),
                ))
            }
        })
    }

    fn resume_tracking(
        &self,
        line_id: i64,
    ) -> std::pin::Pin<
        Box<dyn Future<Output = Result<TrackerEntryLineViewDto, AppError>> + Send + '_>,
    > {
        Box::pin(async move {
            // Get the line
            let line = self
                .repo
                .get_entry_line(self.pool.clone(), line_id)
                .await?
                .ok_or_else(|| AppError::NotFound(format!("Line with id {} not found", line_id)))?;

            // Get all durations for this line
            let durations = self
                .repo
                .get_line_durations(self.pool.clone(), line.clone())
                .await?;

            // Check if there's already an active duration
            if durations.iter().any(|d| d.ended_at.is_none()) {
                return Err(AppError::ValidationError(
                    "Line already has an active duration".to_string(),
                ));
            }

            // Create new duration entry
            let duration = TrackerEntryLineDuration::new(0, line.id, Utc::now(), None);

            let created_duration = self
                .repo
                .create_line_duration(self.pool.clone(), duration)
                .await?;

            // Get all durations to return complete data
            let all_durations = self
                .repo
                .get_line_durations(self.pool.clone(), line.clone())
                .await?;
            let duration_dtos: Vec<TrackerEntryLineDurationViewDto> = all_durations
                .into_iter()
                .map(TrackerEntryLineDurationViewDto::from)
                .collect();

            let mut line_dto = TrackerEntryLineViewDto::from(line);
            line_dto.durations = duration_dtos;

            Ok(line_dto)
        })
    }

    fn update_tracked(
        &self,
        dto: TrackerEntryLineUpdateDto,
    ) -> std::pin::Pin<
        Box<dyn Future<Output = Result<TrackerEntryLineViewDto, AppError>> + Send + '_>,
    > {
        Box::pin(async move {
            let mut line = self
                .repo
                .get_entry_line(self.pool.clone(), dto.id)
                .await?
                .ok_or_else(|| AppError::NotFound(format!("Line with id {} not found", dto.id)))?;

            line.desc = dto.desc;
            line.updated_at = Utc::now();

            let updated = self
                .repo
                .update_entry_line(self.pool.clone(), line.clone())
                .await?;

            // Get durations for complete data
            let durations = self
                .repo
                .get_line_durations(self.pool.clone(), updated.clone())
                .await?;
            let duration_dtos: Vec<TrackerEntryLineDurationViewDto> = durations
                .into_iter()
                .map(TrackerEntryLineDurationViewDto::from)
                .collect();

            let mut line_dto = TrackerEntryLineViewDto::from(updated);
            line_dto.durations = duration_dtos;

            Ok(line_dto)
        })
    }

    fn remove_tracked(
        &self,
        dto: TrackerEntryLineDeleteDto,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<(), AppError>> + Send + '_>> {
        Box::pin(async move {
            let line = self
                .repo
                .get_entry_line(self.pool.clone(), dto.id)
                .await?
                .ok_or_else(|| AppError::NotFound(format!("Line with id {} not found", dto.id)))?;

            self.repo.delete_entry_line(self.pool.clone(), line).await?;

            Ok(())
        })
    }

    fn delete_tracker(
        &self,
        dto: TrackerEntryDeleteDto,
    ) -> std::pin::Pin<Box<dyn Future<Output = Result<(), AppError>> + Send + '_>> {
        Box::pin(async move {
            let entry = self
                .repo
                .get_entry(self.pool.clone(), dto.id)
                .await?
                .ok_or_else(|| AppError::NotFound(format!("Entry with id {} not found", dto.id)))?;

            self.repo
                .delete_lines_for_entry(self.pool.clone(), entry.clone())
                .await?;

            self.repo.delete_entry(self.pool.clone(), entry).await?;

            Ok(())
        })
    }
}
