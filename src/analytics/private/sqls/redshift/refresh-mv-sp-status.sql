CREATE TABLE IF NOT EXISTS {{schema}}.{{table_refresh_mv_sp_status}} (
    refresh_name varchar(50),
    refresh_type varchar(10), 
    refresh_date date,
    triggerred_by varchar(50),
    log_date TIMESTAMP default getdate()
);
