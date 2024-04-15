CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.{{viewName}} (
    event_date date,
    aggregation_type varchar(255),
    aggregation_dim varchar(65535),
    platform varchar(255),
    user_id varchar(255),
    new_user_count bigint,
    session_count bigint,
    engagement_session_count bigint,
    engagement_rate decimal,
    avg_user_engagement_time_minutes double precision,
    event_count bigint,
    update_timestamp timestamp DEFAULT getdate()
)
BACKUP YES
SORTKEY(event_date)
;