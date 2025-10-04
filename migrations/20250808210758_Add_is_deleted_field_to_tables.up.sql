-- Add up migration script here

alter table tracker_entry
    add column is_deleted boolean default false;

alter table tracker_entry_line
    add column is_deleted boolean default false;