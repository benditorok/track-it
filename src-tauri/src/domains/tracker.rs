mod domain {
    pub mod model;
    pub mod repository;
    pub mod service;
}

pub mod dto {
    pub mod tracker_dto;
}

mod infra {
    mod impl_repository;
    pub mod impl_service;
}

// Re-export commonly used items for convenience
pub use domain::model::{TrackerEntry, TrackerEntryLine};
pub use domain::repository::TrackerRepositoryTrait;
pub use domain::service::TrackerServiceTrait;
pub use dto::tracker_dto::*;
pub use infra::impl_service::TrackerService;
