CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date date,
    platform varchar(255),
    aggregation_type varchar(255),
    aggregation_dim varchar(65535),
    user_id varchar(255)
)
BACKUP YES
SORTKEY(event_date)