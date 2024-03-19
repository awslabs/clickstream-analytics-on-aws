CREATE TABLE IF NOT EXISTS {{dbName}}.{{schema}}.clickstream_dashboard_day_user_acquisition (
    event_date date,
    aggregation_type varchar(255),
    aggregation_dim varchar(65535),
    platform varchar(255),
    new_user_cnt bigint,
    session_cnt bigint,
    engagement_session_cnt bigint,
    engagement_rate decimal,
    avg_user_engagement_time_msec bigint,
    event_cnt bigint
)
BACKUP YES
SORTKEY(event_date)
;