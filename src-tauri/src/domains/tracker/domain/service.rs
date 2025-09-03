use crate::{
    domains::tracker::dto::tracker_dto::{
        TrackerEntryCreateDto, TrackerEntryDeleteDto, TrackerEntryLineCreateDto,
        TrackerEntryLineDeleteDto, TrackerEntryLineUpdateDto, TrackerEntryLineViewDto,
        TrackerEntryViewDto,
    },
    error::AppError,
};
use sqlx::SqlitePool;
use std::{pin::Pin, sync::Arc};

pub trait TrackerServiceTrait: Send + Sync {
    fn create_service(pool: SqlitePool) -> Arc<dyn TrackerServiceTrait>
    where
        Self: Sized;

    fn create_tracker(
        &self,
        dto: TrackerEntryCreateDto,
    ) -> Pin<Box<dyn Future<Output = Result<TrackerEntryViewDto, AppError>> + Send + '_>>;

    fn get_trackers(
        &self,
    ) -> Pin<Box<dyn Future<Output = Result<Vec<TrackerEntryViewDto>, AppError>> + Send + '_>>;

    fn get_tracker_lines(
        &self,
    ) -> Pin<Box<dyn Future<Output = Result<Vec<TrackerEntryLineViewDto>, AppError>> + Send + '_>>;

    fn start_tracking(
        &self,
        dto: TrackerEntryLineCreateDto,
    ) -> Pin<Box<dyn Future<Output = Result<TrackerEntryLineViewDto, AppError>> + Send + '_>>;

    fn update_tracked(
        &self,
        dto: TrackerEntryLineUpdateDto,
    ) -> Pin<Box<dyn Future<Output = Result<TrackerEntryLineViewDto, AppError>> + Send + '_>>;

    fn remove_tracked(
        &self,
        dto: TrackerEntryLineDeleteDto,
    ) -> Pin<Box<dyn Future<Output = Result<(), AppError>> + Send + '_>>;

    fn delete_tracker(
        &self,
        dto: TrackerEntryDeleteDto,
    ) -> Pin<Box<dyn Future<Output = Result<(), AppError>> + Send + '_>>;
}
