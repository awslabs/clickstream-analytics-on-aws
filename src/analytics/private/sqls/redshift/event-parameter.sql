CREATE TABLE IF NOT EXISTS {{schema}}.{{table_event_parameter}}(
    event_id VARCHAR(255) DEFAULT RANDOM(),
    event_date DATE, 
    event_timestamp BIGINT,
    app_id VARCHAR(255),
    event_param_key VARCHAR(255),
    event_param_double_value DOUBLE PRECISION,
    event_param_float_value REAL,
    event_param_int_value BIGINT,
    event_param_string_value VARCHAR(255)    
) DISTSTYLE EVEN 
SORTKEY (event_date)
