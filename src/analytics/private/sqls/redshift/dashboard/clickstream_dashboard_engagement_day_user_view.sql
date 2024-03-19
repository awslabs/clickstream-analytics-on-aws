

CREATE TABLE IF NOT EXISTS {{dbName}}.{{schema}}.clickstream_dashboard_engagement_day_user_view (
    event_date date,
    event_cnt bigint,
    view_cnt bigint
)
BACKUP YES
SORTKEY(event_date)
