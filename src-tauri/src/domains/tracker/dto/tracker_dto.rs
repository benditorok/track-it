use crate::domains::tracker::{TrackerEntry, TrackerEntryLine};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackerEntryCreateDto {
    pub label: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Default for TrackerEntryCreateDto {
    fn default() -> Self {
        Self {
            label: String::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}

impl From<TrackerEntry> for TrackerEntryCreateDto {
    fn from(entry: TrackerEntry) -> Self {
        Self {
            label: entry.label,
            created_at: entry.created_at,
            updated_at: entry.updated_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackerEntryViewDto {
    pub id: i64,
    pub label: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Default for TrackerEntryViewDto {
    fn default() -> Self {
        Self {
            id: 0,
            label: String::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}

impl From<TrackerEntry> for TrackerEntryViewDto {
    fn from(entry: TrackerEntry) -> Self {
        Self {
            id: entry.id,
            label: entry.label,
            created_at: entry.created_at,
            updated_at: entry.updated_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackerEntryUpdateDto {
    pub id: i64,
    pub label: String,
    pub updated_at: DateTime<Utc>,
}

impl Default for TrackerEntryUpdateDto {
    fn default() -> Self {
        Self {
            id: 0,
            label: String::new(),
            updated_at: Utc::now(),
        }
    }
}

impl From<TrackerEntry> for TrackerEntryUpdateDto {
    fn from(entry: TrackerEntry) -> Self {
        Self {
            id: entry.id,
            label: entry.label,
            updated_at: entry.updated_at,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TrackerEntryDeleteDto {
    pub id: i64,
}

impl From<TrackerEntry> for TrackerEntryDeleteDto {
    fn from(entry: TrackerEntry) -> Self {
        Self { id: entry.id }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackerEntryLineCreateDto {
    pub entry_id: i64,
    pub desc: String,
    pub started_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Default for TrackerEntryLineCreateDto {
    fn default() -> Self {
        Self {
            entry_id: 0,
            desc: String::new(),
            started_at: Utc::now(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}

impl From<TrackerEntryLine> for TrackerEntryLineCreateDto {
    fn from(line: TrackerEntryLine) -> Self {
        Self {
            entry_id: line.entry_id,
            desc: line.desc,
            started_at: line.started_at,
            created_at: line.created_at,
            updated_at: line.updated_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackerEntryLineViewDto {
    pub id: i64,
    pub entry_id: i64,
    pub desc: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Default for TrackerEntryLineViewDto {
    fn default() -> Self {
        Self {
            id: 0,
            entry_id: 0,
            desc: String::new(),
            started_at: Utc::now(),
            ended_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}

impl From<TrackerEntryLine> for TrackerEntryLineViewDto {
    fn from(line: TrackerEntryLine) -> Self {
        Self {
            id: line.id,
            entry_id: line.entry_id,
            desc: line.desc,
            started_at: line.started_at,
            ended_at: line.ended_at,
            created_at: line.created_at,
            updated_at: line.updated_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackerEntryLineUpdateDto {
    pub id: i64,
    pub entry_id: i64,
    pub desc: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

impl Default for TrackerEntryLineUpdateDto {
    fn default() -> Self {
        Self {
            id: 0,
            entry_id: 0,
            desc: String::new(),
            started_at: Utc::now(),
            ended_at: None,
            updated_at: Utc::now(),
        }
    }
}

impl From<TrackerEntryLine> for TrackerEntryLineUpdateDto {
    fn from(line: TrackerEntryLine) -> Self {
        Self {
            id: line.id,
            entry_id: line.entry_id,
            desc: line.desc,
            started_at: line.started_at,
            ended_at: line.ended_at,
            updated_at: line.updated_at,
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TrackerEntryLineDeleteDto {
    pub id: i64,
}

impl From<TrackerEntryLine> for TrackerEntryLineDeleteDto {
    fn from(line: TrackerEntryLine) -> Self {
        Self { id: line.id }
    }
}
