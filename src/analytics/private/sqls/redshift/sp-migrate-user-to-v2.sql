CREATE OR REPLACE PROCEDURE {{schema}}.sp_migrate_user_to_v2() 
NONATOMIC LANGUAGE plpgsql 
AS 
$$ 
DECLARE 

record_number INT;

log_name VARCHAR(50) := 'sp_migrate_user_to_v2';

BEGIN 

DROP TABLE IF EXISTS tmp_user_props_json;

DROP TABLE IF EXISTS tmp_user_app_install_source;

SET analyze_threshold_percent to 0.01;

analyze {{schema}}."user"(user_pseudo_id);

analyze {{schema}}."user_v2"(user_pseudo_id);

DELETE FROM
    {{schema}}.user_v2
WHERE
    process_info.backfill_start_time IS NOT NULL
    AND process_info.backfill_end_time IS NULL;

INSERT INTO
    {{schema}}.user_v2(
        event_timestamp,
        user_pseudo_id,
        user_id,
        first_touch_time_msec,
        first_visit_date,
        first_referrer,
        first_traffic_source,
        first_traffic_medium,
        process_info
    )
SELECT
    TIMESTAMP 'epoch' + event_timestamp / 1000 * INTERVAL '1 second' AS event_timestamp,
    user_pseudo_id,
    user_id,
    user_first_touch_timestamp AS first_touch_time_msec,
    _first_visit_date AS first_visit_date,
    _first_referer AS first_referrer,
    _first_traffic_source AS first_traffic_source,
    _first_traffic_medium AS first_traffic_medium,
    object(
        'backfill_user',
        true,
        'backfill_start_time',
        getdate() :: text
    ) AS process_info
FROM
    {{schema}}.user_m_view
WHERE
     NOT EXISTS (
            SELECT 1
            FROM {{schema}}.user_v2
            WHERE user_v2.user_pseudo_id = user_m_view.user_pseudo_id
        );

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic (
    log_name,
    'info',
    'insert ' || record_number || ' to user_v2'
);

IF record_number = 0 THEN

    CALL {{schema}}.sp_clickstream_log_non_atomic (
    log_name,
    'info',
    'backfill user_v2 is done');
    
    return;

END IF;


CREATE temp TABLE tmp_user_props_json AS (
    WITH user_props_exploded AS (
        SELECT
            TIMESTAMP 'epoch' + event_timestamp / 1000 * INTERVAL '1 second' AS event_timestamp,
            u.user_pseudo_id,
            p
        FROM
            {{schema}}.user_m_view u,
            u.user_properties p
    ),
    user_props_flat AS (
        SELECT
            distinct event_timestamp,
            user_pseudo_id,
            object(
                p.key :: text,
                object(
                    'value',
                    CASE
                        WHEN p.value.string_value IS NOT NULL THEN p.value.string_value
                        WHEN p.value.int_value IS NOT NULL THEN p.value.int_value::varchar
                        WHEN p.value.double_value IS NOT NULL THEN p.value.double_value::varchar
                    end,
                    'type',
                    CASE
                        WHEN p.value.string_value IS NOT NULL THEN 'string'
                        WHEN p.value.int_value IS NOT NULL THEN 'number'
                        WHEN p.value.double_value IS NOT NULL THEN 'number'
                    end,
                    'set_time_msec',
                    p.value.set_timestamp_micros :: bigint / 1000
                )
            ) user_props
        FROM
            user_props_exploded
    )
    SELECT
        event_timestamp,
        user_pseudo_id,
        {{schema}}.combine_json_list(
            '[' || listagg(json_serialize(user_props), ',') || ']'
        ) AS user_props_json_str
    FROM
        user_props_flat
    GROUP BY
        event_timestamp,
        user_pseudo_id
);

UPDATE
    {{schema}}.user_v2
SET
    user_properties = json_parse(t.user_props_json_str),
    user_properties_json_str = {{schema}}.transform_user_custom_props(t.user_props_json_str),
    process_info = object_transform(
        process_info
        SET
            '"backfill_user_properties"',
            true
    )
FROM
    tmp_user_props_json t
WHERE
    user_v2.event_timestamp = t.event_timestamp
    AND t.user_pseudo_id = t.user_pseudo_id
    AND can_json_parse(user_props_json_str)
    AND user_v2.process_info.backfill_start_time IS NOT NULL
    AND user_v2.process_info.backfill_end_time IS NULL;

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    'update ' || record_number || 'for user_properties in user_v2'
);

CREATE temp TABLE tmp_user_app_install_source AS (
    SELECT
        user_pseudo_id,
        app_install_source
    FROM
        (
            SELECT
                user_pseudo_id,
                app_install_source,
                ROW_NUMBER() OVER (
                    PARTITION BY user_pseudo_id
                    ORDER BY
                        event_timestamp ASC
                ) AS row_number
            FROM
                (
                    SELECT
                        distinct user_pseudo_id,
                        app_install_source,
                        event_timestamp
                    FROM
                        {{schema}}.event_v2
                )
        )
    WHERE
        ROW_NUMBER = 1
);

UPDATE
    {{schema}}.user_v2
SET
    first_app_install_source = t.app_install_source,
    process_info = object_transform(
        process_info
        SET
            '"backfill_first_app_install_source"',
            true
    )
FROM
    tmp_user_app_install_source t
WHERE
    user_v2.user_pseudo_id = t.user_pseudo_id
    AND user_v2.process_info.backfill_start_time IS NOT NULL
    AND user_v2.process_info.backfill_end_time IS NULL;

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    'update ' || record_number || 'for first_app_install_source in user_v2'
);

WITH tmp_user_first_traffic_web AS (
    SELECT
        user_pseudo_id,
        MAX(page_view_page_referrer) AS first_referrer,
        MAX(traffic_source_source) AS first_traffic_source,
        MAX(traffic_source_medium) AS first_traffic_medium,
        MAX(traffic_source_campaign) AS first_traffic_campaign,
        MAX(traffic_source_content) AS first_traffic_content,
        MAX(traffic_source_term) AS first_traffic_term,
        MAX(traffic_source_campaign_id) AS first_traffic_campaign_id,
        MAX(traffic_source_clid_platform) AS first_traffic_clid_platform,
        MAX(traffic_source_clid) AS first_traffic_clid,
        MAX(traffic_source_channel_group) AS first_traffic_channel_group,
        MAX(traffic_source_category) AS first_traffic_category,
        MAX(app_install_source) AS first_app_install_source
    FROM
        {{schema}}.event_v2
    WHERE
        event_name = '_first_open'
        AND platform = 'Web'
    GROUP BY
        user_pseudo_id
)
UPDATE
    {{schema}}.user_v2
SET
    first_referrer = t.first_referrer,
    first_traffic_source = t.first_traffic_source,
    first_traffic_medium = t.first_traffic_medium,
    first_traffic_campaign = t.first_traffic_campaign,
    first_traffic_content = t.first_traffic_content,
    first_traffic_term = t.first_traffic_term,
    first_traffic_campaign_id = t.first_traffic_campaign_id,
    first_traffic_clid_platform = t.first_traffic_clid_platform,
    first_traffic_clid = t.first_traffic_clid,
    first_traffic_channel_group = t.first_traffic_channel_group,
    first_traffic_category = t.first_traffic_category,
    first_app_install_source = t.first_app_install_source,
    process_info = object_transform(
        process_info
        SET
            '"backfill_traffic_source_web"',
            true
    )
FROM
    tmp_user_first_traffic_web t
WHERE
    user_v2.user_pseudo_id = t.user_pseudo_id
    AND user_v2.process_info.backfill_start_time IS NOT NULL
    AND user_v2.process_info.backfill_end_time IS NULL;

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    'update ' || record_number || 'for traffic_source(web) in user_v2'
);

WITH tmp_user_first_session_mobile AS (
    SELECT
        *
    FROM
        (
            SELECT
                event_timestamp,
                event_id,
                user_pseudo_id,
                session_id,
                ROW_NUMBER() OVER (
                    PARTITION BY user_pseudo_id
                    ORDER BY
                        event_timestamp ASC
                ) AS row_number
            FROM
                {{schema}}.event_v2
            WHERE
                event_name IN ('_user_enagement', '_screen_view', '_app_end')
                AND platform != 'Web'
        )
    WHERE
        ROW_NUMBER = 1
),
tmp_user_first_traffic_mobile AS (
    SELECT
        e.user_pseudo_id,
        MAX(page_view_latest_referrer) AS first_referrer,
        coalesce(MAX(traffic_source_source), 'direct') AS first_traffic_source,
        MAX(traffic_source_medium) AS first_traffic_medium,
        coalesce(MAX(traffic_source_campaign), 'direct') AS first_traffic_campaign,
        MAX(traffic_source_content) AS first_traffic_content,
        MAX(traffic_source_term) AS first_traffic_term,
        MAX(traffic_source_campaign_id) AS first_traffic_campaign_id,
        MAX(traffic_source_clid_platform) AS first_traffic_clid_platform,
        MAX(traffic_source_clid) AS first_traffic_clid,
        MAX(traffic_source_channel_group) AS first_traffic_channel_group,
        MAX(traffic_source_category) AS first_traffic_category,
        MAX(app_install_source) AS first_app_install_source
    FROM
        {{schema}}.event_v2 e,
        tmp_user_first_session_mobile t
    WHERE
        e.platform != 'Web'
        AND e.user_pseudo_id = t.user_pseudo_id
        AND e.session_id = t.session_id
        AND e.traffic_source_source != 'direct'
    GROUP BY
        e.user_pseudo_id
)
UPDATE
    {{schema}}.user_v2
SET
    first_referrer = t.first_referrer,
    first_traffic_source = t.first_traffic_source,
    first_traffic_medium = t.first_traffic_medium,
    first_traffic_campaign = t.first_traffic_campaign,
    first_traffic_content = t.first_traffic_content,
    first_traffic_term = t.first_traffic_term,
    first_traffic_campaign_id = t.first_traffic_campaign_id,
    first_traffic_clid_platform = t.first_traffic_clid_platform,
    first_traffic_clid = t.first_traffic_clid,
    first_traffic_channel_group = t.first_traffic_channel_group,
    first_traffic_category = t.first_traffic_category,
    first_app_install_source = t.first_app_install_source,
    process_info = object_transform(
        process_info
        SET
            '"backfill_traffic_source_mobile"',
            true
    )
FROM
    tmp_user_first_traffic_mobile t
WHERE
    user_v2.user_pseudo_id = t.user_pseudo_id
    AND user_v2.process_info.backfill_start_time IS NOT NULL
    AND user_v2.process_info.backfill_end_time IS NULL;

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    'update ' || record_number || 'for traffic_source(mobile) in user_v2'
);

UPDATE
    {{schema}}.user_v2
SET
    process_info = object_transform(
        process_info
        SET
            '"backfill_end_time"',
            getdate() :: text
    )
WHERE
    user_v2.process_info.backfill_start_time IS NOT NULL
    AND user_v2.process_info.backfill_end_time IS NULL;


CALL {{schema}}.sp_clickstream_log_non_atomic (
    log_name,
    'info',
    'backfill is done ---- user_v2'
);

REFRESH MATERIALIZED VIEW {{schema}}.user_m_max_view_v2;

REFRESH MATERIALIZED VIEW {{schema}}.user_m_view_v2;

EXCEPTION
WHEN OTHERS THEN 

CALL {{schema}}.sp_clickstream_log_non_atomic(log_name, 'error', 'error message:' || SQLERRM);

END;

$$