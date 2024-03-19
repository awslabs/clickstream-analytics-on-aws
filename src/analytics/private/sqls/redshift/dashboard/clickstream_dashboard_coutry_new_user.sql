CREATE TABLE IF NOT EXISTS {{dbName}}.{{schema}}.clickstream_dashboard_coutry_new_user (
    event_date date,
    geo_country varchar(255),
    user_count bigint
)
BACKUP YES
SORTKEY(event_date)
