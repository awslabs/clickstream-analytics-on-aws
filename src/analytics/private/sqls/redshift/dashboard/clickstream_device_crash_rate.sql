CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_device_crash_rate(
    event_date date,
    platform varchar(255),
    merged_user_id varchar(255),
    crashed_user_id varchar(255)
)
BACKUP YES
SORTKEY(event_date)