-- Add up migration script here

-- Create a new table to store line durations
create table if not exists tracker_entry_line_duration (
    id integer primary key autoincrement,
    entry_line_id integer not null references tracker_entry_line(id),
    started_at datetime not null default current_timestamp,
    ended_at datetime,
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp,
    is_deleted boolean default false
);

-- Insert existing data into the new table
insert into tracker_entry_line_duration (entry_line_id, started_at, ended_at)
    select id, started_at, ended_at from tracker_entry_line;

alter table tracker_entry_line
    drop column started_at;

alter table tracker_entry_line
    drop column ended_at;
