CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view_detail (
    event_date date,
    platform varchar(255),
    aggregation_type varchar(255),
    aggregation_dim varchar(65535),
    user_id varchar(255),
    user_engagement_time_minutes double precision,
    event_id varchar(255)
)
BACKUP YES
DISTSTYLE EVEN
SORTKEY(event_date)
;