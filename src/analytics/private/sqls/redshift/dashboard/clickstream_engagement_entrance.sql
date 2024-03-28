CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_engagement_entrance (
    event_date date,
    platform varchar(255),
    aggregation_type varchar(255),
    aggregation_dim varchar(65535),
    entrance_cnt bigint
)
BACKUP YES
DISTSTYLE EVEN
SORTKEY(event_date)
;