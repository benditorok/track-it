-- Add down migration script here

alter table tracker_entry_line
    add column duration integer;