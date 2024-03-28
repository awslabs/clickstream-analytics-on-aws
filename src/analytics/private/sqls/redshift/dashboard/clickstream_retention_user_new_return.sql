CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_retention_user_new_return (
    event_date date,
    platform varchar(255),
    user_type varchar(50),
    user_cnt bigint
)
BACKUP YES
SORTKEY(event_date)