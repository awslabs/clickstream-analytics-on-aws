CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.{{viewName}} (
    event_date date,
    platform varchar(255),
    geo_country varchar(255),
    geo_city varchar(255),
    user_count bigint,
    update_timestamp timestamp DEFAULT getdate()
)
BACKUP YES
SORTKEY(event_date)
