CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date date,
    aggregation_type varchar(255),
    aggregation_dim varchar(65535),
    platform varchar(255),
    user_id varchar(255),
    new_user_cnt bigint,
    session_cnt bigint,
    engagement_session_cnt bigint,
    engagement_rate decimal,
    avg_user_engagement_time_minutes double precision,
    event_cnt bigint
)
BACKUP YES
SORTKEY(event_date)
;