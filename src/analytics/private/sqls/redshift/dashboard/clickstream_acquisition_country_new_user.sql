CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.clickstream_acquisition_country_new_user (
    event_date date,
    geo_country varchar(255),
    user_count bigint
)
BACKUP YES
SORTKEY(event_date)
