CREATE TABLE IF NOT EXISTS {{schema}}.{{table_user}}(
    event_timestamp BIGINT,
    user_id VARCHAR(255),
    user_pseudo_id VARCHAR(255),
    user_first_touch_timestamp BIGINT,
    user_properties SUPER,
    user_ltv SUPER,
    _first_visit_date DATE,
    _first_referer VARCHAR(255),
    _first_traffic_source_type VARCHAR(255),
    _first_traffic_medium VARCHAR(255),
    _first_traffic_source VARCHAR(255),
    device_id_list SUPER,
    _channel VARCHAR(255)
) DISTSTYLE EVEN 
SORTKEY(user_id, event_timestamp)