use chrono::{DateTime, Utc};
use std::fmt;

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize, sqlx::FromRow)]
pub struct TrackerEntry {
    pub id: i64,
    pub label: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_deleted: bool,
}

impl TrackerEntry {
    pub fn new(id: i64, label: String) -> Self {
        Self {
            id,
            label,
            ..Default::default()
        }
    }
}

impl Default for TrackerEntry {
    fn default() -> Self {
        Self {
            id: 0,
            label: String::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            is_deleted: false,
        }
    }
}

impl fmt::Display for TrackerEntry {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "TrackerEntry(id: {}, label: {}, created_at: {}, updated_at: {})",
            self.id, self.label, self.created_at, self.updated_at
        )
    }
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize, sqlx::FromRow)]
pub struct TrackerEntryLine {
    pub id: i64,
    pub entry_id: i64,
    pub desc: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_deleted: bool,
}

impl TrackerEntryLine {
    pub fn new(
        id: i64,
        entry_id: i64,
        desc: String,
        started_at: DateTime<Utc>,
        ended_at: Option<DateTime<Utc>>,
    ) -> Self {
        Self {
            id,
            entry_id,
            desc,
            started_at,
            ended_at,
            ..Default::default()
        }
    }
}

impl Default for TrackerEntryLine {
    fn default() -> Self {
        Self {
            id: 0,
            entry_id: 0,
            desc: String::new(),
            started_at: Utc::now(),
            ended_at: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            is_deleted: false,
        }
    }
}

impl fmt::Display for TrackerEntryLine {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "TrackerEntryLine(id: {}, entry_id: {}, desc: {}, started_at: {}, ended_at: {:?}, created_at: {}, updated_at: {})",
            self.id,
            self.entry_id,
            self.desc,
            self.started_at,
            self.ended_at,
            self.created_at,
            self.updated_at
        )
    }
}
