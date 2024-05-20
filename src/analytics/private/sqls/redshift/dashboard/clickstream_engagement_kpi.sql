

CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.{{viewName}} (
    event_date date,
    platform varchar(255),
    avg_engaged_session_per_user real,
    avg_engagement_time_per_session_seconds real,
    avg_engagement_time_per_user_seconds real,
    update_timestamp timestamp DEFAULT getdate()
)
BACKUP YES
SORTKEY(event_date)
;
