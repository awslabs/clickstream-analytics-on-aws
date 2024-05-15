CREATE TABLE IF NOT EXISTS {{schema}}.{{table_clickstream_log}} (
    id varchar(256),
    log_name varchar(256),
    log_level varchar(32), 
    log_msg varchar(65535),
    log_date TIMESTAMP default getdate()
);
