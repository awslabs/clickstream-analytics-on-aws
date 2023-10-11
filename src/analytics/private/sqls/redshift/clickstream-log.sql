CREATE TABLE IF NOT EXISTS {{schema}}.{{table_clickstream_log}} (
    id varchar(256),
    log_name varchar(50),
    log_level varchar(10), 
    log_msg varchar(256),
    log_date TIMESTAMP default getdate()
);
