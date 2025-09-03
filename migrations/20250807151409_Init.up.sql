-- Add up migration script here

create table if not exists tracker_entry (
    id integer primary key autoincrement,
    label text not null,
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp
);

create table if not exists tracker_entry_line (
    id integer primary key autoincrement,
    entry_id integer not null references tracker_entry(id),
    desc text not null,
    started_at datetime default current_timestamp,
    ended_at datetime,
    duration integer,
    created_at datetime default current_timestamp,
    updated_at datetime default current_timestamp
);