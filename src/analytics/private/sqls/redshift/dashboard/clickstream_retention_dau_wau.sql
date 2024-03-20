CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_retention_dau_wau(
    event_date date,
    platform varchar(255),
    merged_user_id varchar(255)
)
BACKUP YES
SORTKEY(event_date)