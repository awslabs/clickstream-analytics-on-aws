CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date date,
    platform varchar(255),
    first_traffic_source varchar(65535),
    user_count bigint
)
BACKUP YES
SORTKEY(event_date)