CREATE TABLE IF NOT EXISTS {{schema}}.{{table_item}}(
    app_id VARCHAR(255),
    event_date DATE, 
    event_timestamp BIGINT,
    id VARCHAR(255),
    properties SUPER
) DISTSTYLE EVEN 
SORTKEY (event_date)
