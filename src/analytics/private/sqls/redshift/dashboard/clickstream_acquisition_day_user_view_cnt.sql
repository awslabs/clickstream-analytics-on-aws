CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.{{viewName}}(
    event_date date,
    platform varchar(255),
    "Active User" varchar(255),
    "New User" varchar(255),
    view_count bigint
)
BACKUP YES
SORTKEY(event_date)
;