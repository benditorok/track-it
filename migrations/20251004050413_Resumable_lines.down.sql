-- Add down migration script here

-- Create temporary table with the desired schema
create table tracker_entry_line_new (
    id integer primary key autoincrement,
    entry_id integer not null references tracker_entry(id),
    desc text not null,
    started_at datetime default current_timestamp,
    ended_at datetime,
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp,
    is_deleted boolean default false
);

-- Copy data and populate started_at/ended_at from duration table
insert into tracker_entry_line_new (id, entry_id, desc, started_at, ended_at, created_at, updated_at)
    select tel.id, tel.entry_id, tel.desc, teld.started_at, teld.ended_at, tel.created_at, tel.updated_at
    from tracker_entry_line tel
    left join tracker_entry_line_duration teld on teld.entry_line_id = tel.id
    where tel.is_deleted = false and teld.is_deleted = false;

-- Drop duration table first (it has FK to tracker_entry_line)
drop table if exists tracker_entry_line_duration;

-- Now drop old table and rename new one
drop table tracker_entry_line;
    alter table tracker_entry_line_new rename to tracker_entry_line;
