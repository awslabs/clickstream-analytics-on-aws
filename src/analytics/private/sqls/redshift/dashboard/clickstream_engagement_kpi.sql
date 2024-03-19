

CREATE TABLE IF NOT EXISTS {{dbName}}.{{schema}}.clickstream_engagement_kpi (
    event_date date,
    avg_session_per_user bigint,
    avg_engagement_time_per_session bigint,
    avg_engagement_time_per_user bigint
)
BACKUP YES
SORTKEY(event_date)
;
