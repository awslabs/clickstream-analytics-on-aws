CREATE TABLE IF NOT EXISTS {{schema}}.{{table_event_parameter}}(
    event_timestamp BIGINT,
    event_id VARCHAR(255),
    event_name VARCHAR(255),
    event_param_key VARCHAR(255),
    event_param_double_value DOUBLE PRECISION,
    event_param_float_value DOUBLE PRECISION,
    event_param_int_value BIGINT,
    event_param_string_value VARCHAR(255)    
) DISTSTYLE EVEN 
SORTKEY(event_timestamp, event_name)
