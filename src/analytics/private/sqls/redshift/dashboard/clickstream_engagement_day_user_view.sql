CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_engagement_day_user_view (
    event_date date,
    event_cnt bigint,
    view_cnt bigint
)
BACKUP YES
SORTKEY(event_date)
