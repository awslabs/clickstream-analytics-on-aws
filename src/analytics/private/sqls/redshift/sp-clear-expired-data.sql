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
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'get event_timestamp = ' || latest_timestamp_record.event_timestamp || ' from {{schema}}.{{table_event_v2}}');
    IF latest_timestamp_record.event_timestamp is null THEN
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'no event_timestamp found in {{schema}}.{{table_event_v2}}');
    ELSE
        DELETE FROM {{schema}}.{{table_event_v2}} WHERE event_timestamp < (latest_timestamp_record.event_timestamp - retention_range_days * interval '1 day');
        GET DIAGNOSTICS record_number := ROW_COUNT;
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'delete '||record_number||' expired records from {{schema}}.{{table_event_v2}} for retention_range_days='||retention_range_days);
        ANALYZE {{schema}}.{{table_event_v2}};
    END IF;

    --  clean table_item_v2 expired records
    EXECUTE 'SELECT event_timestamp FROM {{schema}}.{{table_item_v2}} ORDER BY event_timestamp DESC LIMIT 1' INTO latest_timestamp_record;
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'get event_timestamp = ' || latest_timestamp_record.event_timestamp || ' from {{schema}}.{{table_item_v2}}');
    IF latest_timestamp_record.event_timestamp is null THEN
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'no event_timestamp found in {{schema}}.{{table_item_v2}}');
    ELSE
        DELETE FROM {{schema}}.{{table_item_v2}} WHERE event_timestamp < (latest_timestamp_record.event_timestamp - retention_range_days * interval '1 day');
        GET DIAGNOSTICS record_number := ROW_COUNT;
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'delete '||record_number||' expired records from {{schema}}.{{table_item_v2}} for retention_range_days='||retention_range_days);
        ANALYZE {{schema}}.{{table_item_v2}};
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
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'delete '||record_number||' from {{schema}}.{{table_session}}');
    ANALYZE {{schema}}.{{table_session}};

    --  clean table_session expired records
    EXECUTE 'SELECT event_timestamp FROM {{schema}}.{{table_session}} ORDER BY event_timestamp DESC LIMIT 1' INTO latest_timestamp_record;
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'get event_timestamp = ' || latest_timestamp_record.event_timestamp || ' from {{schema}}.{{table_session}}');
    IF latest_timestamp_record.event_timestamp is null THEN
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'no event_timestamp found in {{schema}}.{{table_session}}');
    ELSE
        DELETE FROM {{schema}}.{{table_session}} WHERE event_timestamp < (latest_timestamp_record.event_timestamp - retention_range_days * interval '1 day');
        GET DIAGNOSTICS record_number := ROW_COUNT;
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'delete '||record_number||' expired records from {{schema}}.{{table_session}} for retention_range_days='||retention_range_days);
        ANALYZE {{schema}}.{{table_session}};
    END IF; 

    -- clean table_user_v2 duplicate records
    WITH user_id_rank AS(
	SELECT  user_pseudo_id
	       ,ROW_NUMBER() over ( partition by user_pseudo_id ORDER BY event_timestamp desc ) AS et_rank
	FROM {{schema}}.{{table_user_v2}})
    delete from {{schema}}.{{table_user_v2}} using user_id_rank  
    where {{schema}}.{{table_user_v2}}.user_pseudo_id = user_id_rank.user_pseudo_id and user_id_rank.et_rank != 1;

    GET DIAGNOSTICS record_number := ROW_COUNT;
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'delete '||record_number||' from {{schema}}.{{table_user_v2}}');
    ANALYZE {{schema}}.{{table_user_v2}};

    -- clean sp tables expired records
    num_tables := REGEXP_COUNT(table_names, ',') + 1;
    FOR rec_index IN 1..num_tables LOOP
        current_table_name := SPLIT_PART(table_names, ',', rec_index);
        EXECUTE 'SELECT event_date FROM {{schema}}.' || quote_ident(current_table_name) || ' ORDER BY event_date DESC LIMIT 1' INTO latest_timestamp_record;
        CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'get event_date = ' || latest_timestamp_record.event_date || ' from {{schema}}.' || current_table_name );
        IF latest_timestamp_record.event_date is null THEN
            CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'no event_date found in from {{schema}}.' || current_table_name );
        ELSE
            EXECUTE 'DELETE FROM {{schema}}.' || quote_ident(current_table_name) || ' WHERE event_date < ''' || (latest_timestamp_record.event_date - retention_range_days * interval '1 day')::text || '''';
            GET DIAGNOSTICS record_number := ROW_COUNT;
            CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'delete '||record_number||' expired records from {{schema}}.' || current_table_name || ' for retention_range_days='||retention_range_days);
            EXECUTE 'ANALYZE {{schema}}.' || quote_ident(current_table_name) || '';
        END IF;        
	END LOOP;

EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'error', 'error message:' || SQLERRM);    
END;
$$ LANGUAGE plpgsql;