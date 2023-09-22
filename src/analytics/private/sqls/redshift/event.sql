CREATE TABLE IF NOT EXISTS {{schema}}.{{table_event}}(
    event_id VARCHAR(255),
    event_date DATE, 
    event_timestamp BIGINT,
    event_previous_timestamp BIGINT,
    event_name VARCHAR(255),
    event_value_in_usd FLOAT,
    event_bundle_sequence_id BIGINT,
    ingest_timestamp BIGINT,
    device SUPER, 
    geo SUPER, 
    traffic_source SUPER,
    app_info SUPER, 
    platform VARCHAR(255),
    project_id VARCHAR(255),
    items SUPER,
    user_pseudo_id VARCHAR(255),
    user_id VARCHAR(255)
) DISTSTYLE EVEN 
SORTKEY(event_timestamp, event_name)
