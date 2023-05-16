CREATE OR REPLACE PROCEDURE {{schema}}.sp_clear_expired_events(retention_range_days in int) 
AS
$$
DECLARE
    record_number INT; 
    ods_tbl_name varchar(50) := '{{schema}}.{{table_ods_events}}';
    latest_timestamp_record RECORD;
    log_name varchar(50) := 'sp_clear_expired_events';
BEGIN
    EXECUTE 'SELECT event_timestamp FROM {{schema}}.{{table_ods_events}} ORDER BY event_timestamp DESC LIMIT 1' INTO latest_timestamp_record;
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'get event_timestamp = ' || latest_timestamp_record.event_timestamp || ' from {{schema}}.{{table_ods_events}}');
    IF latest_timestamp_record.event_timestamp is null THEN
        CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'no event_timestamp found in {{schema}}.{{table_ods_events}}');
    ELSE
        DELETE FROM {{schema}}.{{table_ods_events}} WHERE CAST(event_date as date) < DATEADD(day, -retention_range_days, CAST(event_date as date));
        GET DIAGNOSTICS record_number := ROW_COUNT;
        CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'delete '||record_number||' records expired for retention_range_days='||retention_range_days);
        ANALYZE {{schema}}.{{table_ods_events}};
    END IF;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);    
END;
$$ LANGUAGE plpgsql;