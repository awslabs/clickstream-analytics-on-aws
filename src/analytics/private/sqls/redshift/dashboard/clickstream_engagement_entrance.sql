CREATE TABLE IF NOT EXISTS {{dbName}}.{{schema}}.clickstream_engagement_entrance (
    event_date date,
    aggregation_type varchar(255),
    aggregation_dim varchar(65535),
    entrance_cnt bigint
)
BACKUP YES
DISTSTYLE EVEN
SORTKEY(event_date)
;