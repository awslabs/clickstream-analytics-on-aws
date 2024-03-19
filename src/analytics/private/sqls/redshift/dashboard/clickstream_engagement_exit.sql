CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_engagement_exit (
    event_date date,
    aggregation_type varchar(255),
    aggregation_dim varchar(65535),
    exit_cnt bigint
)
BACKUP YES
DISTSTYLE EVEN
SORTKEY(event_date)
;