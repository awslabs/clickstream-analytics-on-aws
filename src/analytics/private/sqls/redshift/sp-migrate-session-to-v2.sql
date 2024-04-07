CREATE OR REPLACE PROCEDURE {{schema}}.sp_migrate_session_to_v2() 
NONATOMIC 
LANGUAGE plpgsql 
AS $$ 

DECLARE 

record_number INT;

log_name VARCHAR(50) := 'sp_migrate_session_to_v2';

BEGIN 

DROP TABLE IF EXISTS tmp_traffic_session_web;

DROP TABLE IF EXISTS tmp_traffic_session_mobile;

SET analyze_threshold_percent to 0.01;

analyze {{schema}}."session"(user_pseudo_id, session_id);


DELETE FROM
    {{schema}}.session
WHERE
    process_info.backfill_start_time IS NOT NULL
    AND process_info.backfill_end_time IS NULL;


INSERT INTO
    {{schema}}.session(
        user_pseudo_id,
        session_id,
        user_id,
        session_number,
        session_start_time_msec,
        event_timestamp,
        process_info
    )
SELECT
    user_pseudo_id,
    session_id,
    MAX(user_id),
    MAX(session_number),
    MIN(session_start_time_msec::bigint),
    MAX(event_timestamp),
    object('backfill_session', true, 'backfill_start_time', getdate() :: text)
FROM
    {{schema}}.event_v2
WHERE session_id IS NOT NULL
    AND NOT EXISTS (
            SELECT 1
            FROM {{schema}}.session
            WHERE session.user_pseudo_id = event_v2.user_pseudo_id
                AND session.session_id = event_v2.session_id)
GROUP BY
    user_pseudo_id,
    session_id;

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic (
    log_name,
    'info',
    'insert ' || record_number || ' into session'
);

IF record_number = 0 THEN

    CALL {{schema}}.sp_clickstream_log_non_atomic (
    log_name,
    'info',
    'backfill session is done');
    
    return;

END IF;


CREATE temp TABLE tmp_traffic_session_web AS (
    SELECT
        user_pseudo_id,
        session_id,
        MAX(traffic_source_source) AS session_source,
        MAX(traffic_source_medium) AS session_medium,
        MAX(traffic_source_campaign) AS session_campaign,
        MAX(traffic_source_content) AS session_content,
        MAX(traffic_source_term) AS session_term,
        MAX(traffic_source_campaign_id) AS session_campaign_id,
        MAX(traffic_source_clid_platform) AS session_clid_platform,
        MAX(traffic_source_clid) AS session_clid,
        MAX(traffic_source_channel_group) AS session_channel_group,
        MAX(traffic_source_category) AS session_source_category
    FROM
        {{schema}}.event_v2
    WHERE
        event_name = '_session_start'
        AND (platform = 'Web' OR platform IS NULL OR page_view_page_url IS NOT NULL) -- for backward compatibility
    GROUP BY
        user_pseudo_id,
        session_id
);

UPDATE
    {{schema}}.session
SET
    session_source = t.session_source,
    session_medium = t.session_medium,
    session_campaign = t.session_campaign,
    session_content = t.session_content,
    session_term = t.session_term,
    session_campaign_id = t.session_campaign_id,
    session_clid_platform = t.session_clid_platform,
    session_clid = t.session_clid,
    session_channel_group = t.session_channel_group,
    session_source_category = t.session_source_category,
    process_info = object_transform(
        process_info
        SET
            '"backfill_traffic_source_web"',
            true
    )
FROM
    tmp_traffic_session_web t
WHERE
    session.user_pseudo_id = t.user_pseudo_id
    AND session.session_id = t.session_id
    AND session.process_info.backfill_start_time IS NOT NULL
    AND session.process_info.backfill_end_time IS NULL;

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic (
    log_name,
    'info',
    'update ' || record_number || ' traffic_source for session(web)'
);

CREATE temp TABLE tmp_traffic_session_mobile AS (
    SELECT
        e.user_pseudo_id,
        e.session_id,
        coalesce(MAX(traffic_source_source), 'direct') AS session_source,
        MAX(traffic_source_medium) AS session_medium,
        coalesce(MAX(traffic_source_campaign), 'direct') AS session_campaign,
        MAX(traffic_source_content) AS session_content,
        MAX(traffic_source_term) AS session_term,
        MAX(traffic_source_campaign_id) AS session_campaign_id,
        MAX(traffic_source_clid_platform) AS session_clid_platform,
        MAX(traffic_source_clid) AS session_clid,
        MAX(traffic_source_channel_group) AS session_channel_group,
        MAX(traffic_source_category) AS session_source_category
    FROM
        {{schema}}.event_v2 e
    WHERE
        e.event_name IN ('_user_enagement', '_screen_view', '_app_end')
        AND e.platform != 'Web' 
        AND e.platform IS NOT NULL
        AND e.traffic_source_source != 'direct'
    GROUP BY
        e.user_pseudo_id,
        e.session_id
);

UPDATE
    {{schema}}.session
SET
    session_source = t.session_source,
    session_medium = t.session_medium,
    session_campaign = t.session_campaign,
    session_content = t.session_content,
    session_term = t.session_term,
    session_campaign_id = t.session_campaign_id,
    session_clid_platform = t.session_clid_platform,
    session_clid = t.session_clid,
    session_channel_group = t.session_channel_group,
    session_source_category = t.session_source_category,
    process_info = object_transform(
        process_info
        SET
            '"backfill_traffic_source_mobile"',
            true
    )
FROM
    tmp_traffic_session_mobile t
WHERE
    session.user_pseudo_id = t.user_pseudo_id
    AND session.session_id = t.session_id
    AND session.process_info.backfill_start_time IS NOT NULL
    AND session.process_info.backfill_end_time IS NULL;

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic (
    log_name,
    'info',
    'update ' || record_number || ' traffic_source for session(mobile)'
);


UPDATE
    {{schema}}.session
SET
    process_info = object_transform(
        process_info
        SET
            '"backfill_end_time"',
            getdate() :: text
    )
WHERE
    session.process_info.backfill_start_time IS NOT NULL
    AND session.process_info.backfill_end_time IS NULL;

CALL {{schema}}.sp_clickstream_log_non_atomic (
    log_name,
    'info',
    'backfill is done ---- session'
);


REFRESH MATERIALIZED VIEW {{schema}}.session_m_max_view;

REFRESH MATERIALIZED VIEW {{schema}}.session_m_view;


EXCEPTION
WHEN OTHERS THEN 

CALL {{schema}}.sp_clickstream_log_non_atomic(log_name, 'error', 'error message:' || SQLERRM);

END;

$$
