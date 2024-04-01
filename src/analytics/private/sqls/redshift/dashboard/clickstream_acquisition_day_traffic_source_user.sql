CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.{{viewName}} (
    event_date date,
    platform varchar(255),
    aggregation_type varchar(255),
    aggregation_dim varchar(65535),
    user_id varchar(255),
    update_timestamp timestamp DEFAULT getdate()
)
BACKUP YES
SORTKEY(event_date)