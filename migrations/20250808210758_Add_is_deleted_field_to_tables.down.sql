-- Add down migration script here

alter table tracker_entry
    drop column is_deleted;

alter table tracker_entry_line
    drop column is_deleted;