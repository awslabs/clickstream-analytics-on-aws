CREATE TABLE IF NOT EXISTS {{schema}}.{{table_user}}(
    event_timestamp BIGINT,
    user_id VARCHAR(255),
    user_pseudo_id VARCHAR(255),
    platform VARCHAR(64), 
    user_first_touch_timestamp BIGINT,
    user_properties SUPER,
    user_ltv SUPER,
    first_visit_date DATE,
    first_referer VARCHAR(255),
    first_traffic_source_type VARCHAR(255),
    first_traffic_medium VARCHAR(255),
    first_traffic_source VARCHAR(255),
    first_channel VARCHAR(255),
    device_id_list SUPER
) DISTSTYLE EVEN 
SORTKEY(user_pseudo_id, event_timestamp)