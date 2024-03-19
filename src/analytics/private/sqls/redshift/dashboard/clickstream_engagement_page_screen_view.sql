CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view (
    event_date date,
    aggregation_type varchar(255),
    aggregation_dim varchar(65535),
    view_cnt bigint
)
BACKUP YES
SORTKEY(event_date)
;