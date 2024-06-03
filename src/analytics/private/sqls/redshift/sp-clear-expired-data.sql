CREATE OR REPLACE PROCEDURE {{schema}}.sp_clear_expired_data(retention_range_days in int, table_names in varchar(65535)) 
NONATOMIC AS
$$
DECLARE
    record_number INT; 
    latest_timestamp_record RECORD;
    rec RECORD;
    query text;
    rec_index int;
    num_tables int;
    current_table_name text;    
    log_name varchar(50) := 'sp_clear_expired_data';
BEGIN

    --  clean table_event_v2 expired records
    EXECUTE 'SELECT event_timestamp FROM {{schema}}.{{table_event_v2}} ORDER BY event_timestamp DESC LIMIT 1' INTO latest_timestamp_record;
    IF latest_timestamp_record.event_timestamp IS NOT NULL THEN
        DELETE FROM {{schema}}.{{table_event_v2}} WHERE event_timestamp < (latest_timestamp_record.event_timestamp - retention_range_days * interval '1 day');
        GET DIAGNOSTICS record_number := ROW_COUNT;
    END IF;

    --  clean table_item_v2 expired records
    EXECUTE 'SELECT event_timestamp FROM {{schema}}.{{table_item_v2}} ORDER BY event_timestamp DESC LIMIT 1' INTO latest_timestamp_record;
    IF latest_timestamp_record.event_timestamp IS NOT NULL THEN
        DELETE FROM {{schema}}.{{table_item_v2}} WHERE event_timestamp < (latest_timestamp_record.event_timestamp - retention_range_days * interval '1 day');
        GET DIAGNOSTICS record_number := ROW_COUNT;
    END IF;

    --  clean table_session duplicate records
    WITH session_id_rank AS(
	SELECT  session_id,
            user_pseudo_id,
	        ROW_NUMBER() over ( partition by session_id, user_pseudo_id ORDER BY event_timestamp desc ) AS et_rank
	FROM {{schema}}.{{table_session}})
    delete from {{schema}}.{{table_session}} using session_id_rank  
    where {{schema}}.{{table_session}}.session_id = session_id_rank.session_id
        and {{schema}}.{{table_session}}.user_pseudo_id = session_id_rank.user_pseudo_id
        and session_id_rank.et_rank != 1;
    GET DIAGNOSTICS record_number := ROW_COUNT;

    --  clean table_session expired records
    EXECUTE 'SELECT event_timestamp FROM {{schema}}.{{table_session}} ORDER BY event_timestamp DESC LIMIT 1' INTO latest_timestamp_record;
    IF latest_timestamp_record.event_timestamp IS NOT NULL THEN
        DELETE FROM {{schema}}.{{table_session}} WHERE event_timestamp < (latest_timestamp_record.event_timestamp - retention_range_days * interval '1 day');
        GET DIAGNOSTICS record_number := ROW_COUNT;
    END IF; 

    --  clean clickstream_log expired records
    EXECUTE 'SELECT log_date FROM {{schema}}.{{table_clickstream_log}} ORDER BY log_date DESC LIMIT 1' INTO latest_timestamp_record;
    IF latest_timestamp_record.log_date IS NOT NULL THEN
        DELETE FROM {{schema}}.{{table_clickstream_log}} WHERE log_date < (latest_timestamp_record.log_date - retention_range_days * interval '1 day');
        GET DIAGNOSTICS record_number := ROW_COUNT;
    END IF; 

    --  clean refresh_mv_sp_status expired records
    EXECUTE 'SELECT log_date FROM {{schema}}.{{table_refresh_mv_sp_status}} ORDER BY log_date DESC LIMIT 1' INTO latest_timestamp_record;
    IF latest_timestamp_record.log_date IS NOT NULL THEN
        DELETE FROM {{schema}}.{{table_refresh_mv_sp_status}} WHERE log_date < (latest_timestamp_record.log_date - retention_range_days * interval '1 day');
        GET DIAGNOSTICS record_number := ROW_COUNT;
    END IF;

    -- clean sp tables expired records
    num_tables := REGEXP_COUNT(table_names, ',') + 1;
    FOR rec_index IN 1..num_tables LOOP
        current_table_name := SPLIT_PART(table_names, ',', rec_index);
        EXECUTE 'SELECT event_date FROM {{schema}}.' || quote_ident(current_table_name) || ' ORDER BY event_date DESC LIMIT 1' INTO latest_timestamp_record;
        IF latest_timestamp_record.event_date IS NOT NULL THEN
            EXECUTE 'DELETE FROM {{schema}}.' || quote_ident(current_table_name) || ' WHERE event_date < ''' || (latest_timestamp_record.event_date - retention_range_days * interval '1 day')::text || '''';
            GET DIAGNOSTICS record_number := ROW_COUNT;
        END IF;        
	END LOOP;

EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'error', 'error message:' || SQLERRM);    
END;
$$ LANGUAGE plpgsql;