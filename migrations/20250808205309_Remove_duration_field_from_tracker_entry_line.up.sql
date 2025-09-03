-- Add up migration script here

alter table tracker_entry_line
    drop column duration;