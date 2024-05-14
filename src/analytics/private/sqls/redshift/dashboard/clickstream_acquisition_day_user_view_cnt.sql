CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.{{viewName}}(
    event_date date,
    platform varchar(255),
    active_users varchar(255),
    new_users varchar(255),
    view_count bigint
)
BACKUP YES
SORTKEY(event_date)
;