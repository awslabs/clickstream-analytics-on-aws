CREATE OR REPLACE PROCEDURE {{schema}}.sp_migrate_data_to_v2(ndays int)
NONATOMIC
LANGUAGE plpgsql
AS $$
DECLARE
    log_name VARCHAR(50) := 'sp_migrate_all_to_v2';
    start_dt TIMESTAMP := GETDATE();
    loop_count INT := 0;

BEGIN

   CALL {{schema}}.sp_clickstream_log_non_atomic(
        log_name,
        'info',
        'backfill all start'
    );

    --------------------------------
    -- event_v2
    CALL {{schema}}.sp_clickstream_log_non_atomic(
        log_name,
        'info',
        'backfill event_v2 start'
    );

    loop_count := 0;
    start_dt := GETDATE();

    WHILE NOT EXISTS (
        SELECT
            1
        FROM
            {{schema}}.clickstream_log
        WHERE
            log_msg = 'backfill event_v2 is done'
            AND log_date > start_dt
    )
    LOOP
        CALL {{schema}}.sp_clickstream_log_non_atomic(
            log_name,
            'info',
            'backfill event_v2 loop_count:' || loop_count
        );

        CALL {{schema}}.sp_migrate_event_to_v2(ndays);

        loop_count := loop_count + 1;
    END LOOP;

    CALL {{schema}}.sp_clickstream_log_non_atomic(
        log_name,
        'info',
        'backfill event_v2 end'
    );

    --------------------------------
    -- user_v2
    CALL {{schema}}.sp_clickstream_log_non_atomic(
        log_name,
        'info',
        'backfill user_v2 start'
    );

    CALL {{schema}}.sp_migrate_user_to_v2();

    CALL {{schema}}.sp_clickstream_log_non_atomic(
        log_name,
        'info',
        'backfill user_v2 end'
    );

    --------------------------------
    -- item_v2

    CALL {{schema}}.sp_clickstream_log_non_atomic(
                log_name,
                'info',
                'backfill item_v2 start'
            );
    
    loop_count := 0;
    start_dt := GETDATE();
    
    WHILE NOT EXISTS (
            SELECT
                1
            FROM
                {{schema}}.clickstream_log
            WHERE
                log_msg = 'backfill item_v2 is done'
                AND log_date > start_dt
        )
        LOOP
    
            CALL {{schema}}.sp_clickstream_log_non_atomic(
                log_name,
                'info',
                'backfill item_v2 loop_count:' || loop_count
            );
    
            CALL {{schema}}.sp_migrate_item_to_v2(ndays);
    
            loop_count := loop_count + 1;  
    END LOOP;
    
    CALL {{schema}}.sp_clickstream_log_non_atomic(
                log_name,
                'info',
                'backfill item_v2 end'
    );

    --------------------------------
    -- session
    CALL {{schema}}.sp_clickstream_log_non_atomic(
        log_name,
        'info',
        'backfill session start'
    );

    CALL {{schema}}.sp_migrate_session_to_v2();

    CALL {{schema}}.sp_clickstream_log_non_atomic(
        log_name,
        'info',
        'backfill session end'
    );
   
   --------------------------------

   CALL {{schema}}.sp_clickstream_log_non_atomic(
        log_name,
        'info',
        'backfill all end'
    );

EXCEPTION
    WHEN OTHERS THEN
        CALL {{schema}}.sp_clickstream_log_non_atomic(log_name, 'error', 'error message:' || SQLERRM);
END;
$$