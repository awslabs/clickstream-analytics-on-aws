CREATE OR REPLACE PROCEDURE {{schema}}.sp_clear_expired_events(retention_range_days in int) 
NONATOMIC AS
$$
DECLARE
    record_number INT; 
    ods_tbl_name varchar(50) := '{{schema}}.{{table_ods_events}}';
    latest_timestamp_record1 RECORD;
    latest_timestamp_record2 RECORD;
    log_name varchar(50) := 'sp_clear_expired_events';
BEGIN

    -- clean table_ods_events
    EXECUTE 'SELECT event_timestamp FROM {{schema}}.{{table_ods_events}} ORDER BY event_timestamp DESC LIMIT 1' INTO latest_timestamp_record1;
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'get event_timestamp = ' || latest_timestamp_record1.event_timestamp || ' from {{schema}}.{{table_ods_events}}');
    IF latest_timestamp_record1.event_timestamp is null THEN
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'no event_timestamp found in {{schema}}.{{table_ods_events}}');
    ELSE
        DELETE FROM {{schema}}.{{table_ods_events}} WHERE event_date < DATEADD(day, -retention_range_days, CAST(TIMESTAMP 'epoch' + (latest_timestamp_record1.event_timestamp / 1000) * INTERVAL '1 second' as date));
        GET DIAGNOSTICS record_number := ROW_COUNT;
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'delete '||record_number||' expired records from {{schema}}.{{table_event}} for retention_range_days='||retention_range_days);
        ANALYZE {{schema}}.{{table_ods_events}};
    END IF;

    --  clean table_event and table_event_parameter
    EXECUTE 'SELECT event_timestamp FROM {{schema}}.{{table_event}} ORDER BY event_timestamp DESC LIMIT 1' INTO latest_timestamp_record2;
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'get event_timestamp = ' || latest_timestamp_record2.event_timestamp || ' from {{schema}}.{{table_ods_events}}');
    IF latest_timestamp_record2.event_timestamp is null THEN
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'no event_timestamp found in {{schema}}.{{table_event}}');
    ELSE
        DELETE FROM {{schema}}.{{table_event}} WHERE event_timestamp < (latest_timestamp_record2.event_timestamp - retention_range_days * 24 * 3600 * 1000);
        GET DIAGNOSTICS record_number := ROW_COUNT;
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'delete '||record_number||' expired records from {{schema}}.{{table_event}} for retention_range_days='||retention_range_days);
        ANALYZE {{schema}}.{{table_event}};

        delete {{schema}}.{{table_event_parameter}} from {{schema}}.{{table_event_parameter}} e WHERE not exists (
            SELECT 1 from  {{schema}}.{{table_event}} p where e.event_id = p.event_id and e.event_timestamp = p.event_timestamp
        );
        GET DIAGNOSTICS record_number := ROW_COUNT;
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'delete '||record_number||' expired records from {{schema}}.{{table_event_parameter}} for retention_range_days='||retention_range_days);
        ANALYZE {{schema}}.{{table_event_parameter}};
    END IF;

    CALL {{schema}}.sp_clear_item_and_user();

EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'error', 'error message:' || SQLERRM);    
END;
$$ LANGUAGE plpgsql;