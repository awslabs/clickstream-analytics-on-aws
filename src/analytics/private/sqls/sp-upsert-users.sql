CREATE OR REPLACE PROCEDURE {{schema}}.{{sp_upsert_users}}()
AS 
$$ 
DECLARE 
  record_number INT; 
  begin_update_timestamp_record RECORD; 
  begin_update_timestamp TIMESTAMP; 
  log_name varchar(50) := '{{sp_upsert_users}}';
BEGIN 
CREATE TEMP TABLE IF NOT EXISTS {{table_ods_users}}( 
    event_timestamp BIGINT,
    user_id VARCHAR(255),
    user_properties SUPER,
    user_pseudo_id VARCHAR(255),
    create_date TIMESTAMP default getdate()
) sortkey(user_pseudo_id, event_timestamp);
EXECUTE 'SELECT event_timestamp FROM {{schema}}.{{table_dim_users}} ORDER BY event_timestamp DESC LIMIT 1' INTO begin_update_timestamp_record;
CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'get event_timestamp = ' || begin_update_timestamp_record.event_timestamp || ' from {{schema}}.{{table_dim_users}}');
IF begin_update_timestamp_record.event_timestamp is null THEN
    EXECUTE 'SELECT event_timestamp FROM {{schema}}.{{table_ods_events}} ORDER BY event_timestamp ASC LIMIT 1' INTO begin_update_timestamp_record;
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'get event_timestamp = ' || begin_update_timestamp_record.event_timestamp || ' from {{schema}}.{{table_ods_events}}');
    INSERT INTO {{table_ods_users}}
    (
        SELECT event_timestamp, user_id, user_properties, user_pseudo_id
        FROM
        (
            SELECT e.event_timestamp, e.user_id, e.user_properties, e.user_pseudo_id,
            sum(1) OVER (PARTITION BY e.user_pseudo_id ORDER BY e.event_timestamp DESC ROWS UNBOUNDED PRECEDING) AS row_number
            FROM {{schema}}.{{table_ods_events}} e, e.user_properties u
            WHERE e.event_timestamp >= begin_update_timestamp_record.event_timestamp
            AND u.key IS NOT NULL
        )
        WHERE row_number = 1
    );
    GET DIAGNOSTICS record_number := ROW_COUNT;
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'rows add in ods_users = ' || record_number);
ELSE
    INSERT INTO {{table_ods_users}}
    (
        SELECT event_timestamp, user_id, user_properties, user_pseudo_id
        FROM
        (
            SELECT e.event_timestamp, e.user_id, e.user_properties, e.user_pseudo_id,
            sum(1) OVER (PARTITION BY e.user_pseudo_id ORDER BY e.event_timestamp DESC ROWS UNBOUNDED PRECEDING) AS row_number
            FROM {{schema}}.{{table_ods_events}} e, e.user_properties u
            WHERE e.event_timestamp > begin_update_timestamp_record.event_timestamp
            AND u.key IS NOT NULL
        )
        WHERE row_number = 1
    );
    GET DIAGNOSTICS record_number := ROW_COUNT;
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'rows add in ods_users = ' || record_number);
END IF;
CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'begin='||begin_update_timestamp_record.event_timestamp);
IF begin_update_timestamp_record.event_timestamp is NULL THEN 
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'nothing to upsert users for event_timestamp is null');
ELSE 
    IF record_number = 0 THEN 
        CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'nothing to upsert users for record_number=0 in ods_users');
    ELSE 
        LOCK {{schema}}.{{table_dim_users}};
        DELETE FROM {{schema}}.{{table_dim_users}}
        WHERE user_pseudo_id NOT IN
        (
            WITH
                current_users AS (
                    SELECT ce.user_pseudo_id, cu.key, 
                    cu.value.double_value, cu.value.float_value, cu.value.int_value, cu.value.string_value, cu.value.set_timestamp_micros
                    FROM {{schema}}.{{table_dim_users}} ce, ce.user_properties cu
                )
                ,latest_users AS (
                    SELECT e.user_pseudo_id, u.key, 
                    u.value.double_value, u.value.float_value, u.value.int_value, u.value.string_value, u.value.set_timestamp_micros
                    FROM {{table_ods_users}} e, e.user_properties u
                )
            SELECT current_users.user_pseudo_id
            FROM latest_users, current_users
            WHERE current_users.user_pseudo_id = latest_users.user_pseudo_id
            AND current_users.key = latest_users.key
            AND current_users.double_value = latest_users.double_value
            AND current_users.float_value = latest_users.float_value
            AND current_users.int_value = latest_users.int_value
            AND current_users.string_value = latest_users.string_value
            AND current_users.set_timestamp_micros = latest_users.set_timestamp_micros
        );
        GET DIAGNOSTICS record_number := ROW_COUNT;
        CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'rows deleted in dim_users = ' || record_number);
        INSERT INTO {{schema}}.{{table_dim_users}}
        (
            event_timestamp,
            user_id,
            user_pseudo_id,
            user_properties
        )
        (
            SELECT 
                event_timestamp,
                user_id,
                user_pseudo_id,
                user_properties
            FROM {{table_ods_users}}
        );
        GET DIAGNOSTICS record_number := ROW_COUNT;
        CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'rows inserted into dim_users = ' || record_number);
        TRUNCATE TABLE {{table_ods_users}};
    END IF;
END IF;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);
END;
$$ LANGUAGE plpgsql