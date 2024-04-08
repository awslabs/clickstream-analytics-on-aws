

CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.{{viewName}} (
    event_date date,
    platform varchar(255),
    avg_session_per_user DOUBLE PRECISION,
    avg_engagement_time_per_session_minutes DOUBLE PRECISION,
    avg_engagement_time_per_user_minutes DOUBLE PRECISION,
    update_timestamp timestamp DEFAULT getdate()
)
BACKUP YES
SORTKEY(event_date)
;
