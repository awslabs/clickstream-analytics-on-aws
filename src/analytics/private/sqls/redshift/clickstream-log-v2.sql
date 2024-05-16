CREATE TABLE IF NOT EXISTS {{schema}}.{{table_clickstream_log}} (
    id BIGINT IDENTITY(1,1),
    log_name varchar(256),
    log_level varchar(32), 
    log_msg varchar(65535),
    log_date TIMESTAMP default getdate()
);
