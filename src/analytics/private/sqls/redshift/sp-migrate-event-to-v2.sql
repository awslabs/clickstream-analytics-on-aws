CREATE OR REPLACE PROCEDURE {{schema}}.sp_migrate_event_to_v2(nday int) 
NONATOMIC LANGUAGE plpgsql
AS 
$$ 

DECLARE 

record_number INT;

pending_rec record;

log_name VARCHAR(50) := 'sp_migrate_event_to_v2';

n_days_ago_msec BIGINT;

BEGIN 

DROP TABLE IF EXISTS tmp_flat_key;

DROP TABLE IF EXISTS tmp_cand_event_id;

DROP TABLE IF EXISTS tmp_event_param_combined;

DROP TABLE IF EXISTS tmp_event_param_custom;

DROP TABLE IF EXISTS tmp_event_traffic_source;

------------------------------
CREATE temp TABLE tmp_flat_key AS (
    SELECT
        '_screen_name' AS param_key
    UNION
    ALL
    SELECT
        '_screen_id'
    UNION
    ALL
    SELECT
        '_screen_unique_id'
    UNION
    ALL
    SELECT
        '_previous_screen_name'
    UNION
    ALL
    SELECT
        '_previous_screen_id'
    UNION
    ALL
    SELECT
        '_previous_screen_unique_id'
    UNION
    ALL
    SELECT
        '_page_referrer'
    UNION
    ALL
    SELECT
        '_page_referrer_title'
    UNION
    ALL
    SELECT
        '_page_title'
    UNION
    ALL
    SELECT
        '_page_url'
    UNION
    ALL
    SELECT
        '_latest_referrer'
    UNION
    ALL
    SELECT
        '_latest_referrer_host'
    UNION
    ALL
    SELECT
        '_is_first_time'
    UNION
    ALL
    SELECT
        '_previous_timestamp'
    UNION
    ALL
    SELECT
        '_entrances'
    UNION
    ALL
    SELECT
        '_previous_app_version'
    UNION
    ALL
    SELECT
        '_previous_os_version'
    UNION
    ALL
    SELECT
        '_search_key'
    UNION
    ALL
    SELECT
        '_search_term'
    UNION
    ALL
    SELECT
        '_link_classes'
    UNION
    ALL
    SELECT
        '_link_domain'
    UNION
    ALL
    SELECT
        '_link_id'
    UNION
    ALL
    SELECT
        '_link_url'
    UNION
    ALL
    SELECT
        '_outbound'
    UNION
    ALL
    SELECT
        '_session_id'
    UNION
    ALL
    SELECT
        '_session_start_timestamp'
    UNION
    ALL
    SELECT
        '_session_duration'
    UNION
    ALL
    SELECT
        '_session_number'
    UNION
    ALL
    SELECT
        '_engagement_time_msec'
    UNION
    ALL
    SELECT
        '_error_code'
    UNION
    ALL
    SELECT
        '_error_message'
    UNION
    ALL
    SELECT
        '_exception_message'
    UNION
    ALL
    SELECT
        '_exception_stack'
    UNION
    ALL
    SELECT
        '_sdk_version'
    UNION
    ALL
    SELECT
        '_sdk_name'
);

------------------------------
execute 'SELECT CAST(EXTRACT(EPOCH FROM (GETDATE() - INTERVAL ''' || nday || ' days'')) AS DOUBLE PRECISION) * 1000' INTO n_days_ago_msec;

------------------------------
CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    '----start---- n_days_ago_msec: ' || n_days_ago_msec::varchar
);

------------------------------
CREATE TABLE if not exists {{schema}}.tmp_backfill_trace (
    min_event_timestamp bigint not NULL,
    max_event_timestamp bigint not NULL,
    start_time TIMESTAMP not NULL,
    row_count bigint not NULL,
    status VARCHAR not NULL,
    END_time TIMESTAMP NULL
);

SET analyze_threshold_percent to 0.01;

analyze {{schema}}.event(event_timestamp, event_id);

analyze {{schema}}.event_v2(event_timestamp, event_id);

analyze {{schema}}.tmp_backfill_trace;

------------------------------
-- prepare candidate event_id

IF EXISTS (
    SELECT
        1
    FROM
        {{schema}}.tmp_backfill_trace
    WHERE
        status != 'done'
) THEN 

    CREATE TEMP TABLE tmp_cand_event_id AS (
        SELECT
            event_timestamp,
            event_id
        FROM
            {{schema}}.event e1,
            {{schema}}.tmp_backfill_trace t
        WHERE
            t.status != 'done'
            AND e1.event_timestamp >= t.min_event_timestamp
            AND e1.event_timestamp <= t.max_event_timestamp
        ORDER BY
            event_timestamp DESC
    );
    
    DELETE {{schema}}.event_v2
    FROM
        tmp_cand_event_id t
    WHERE
        event_v2.event_id = t.event_id;
    
    SELECT
        * INTO pending_rec
    FROM
        {{schema}}.tmp_backfill_trace t
    WHERE
        t.status != 'done';
    
    CALL {{schema}}.sp_clickstream_log_non_atomic(
        log_name,
        'info',
        'retry min_event_timestamp:' || pending_rec.min_event_timestamp || 'max_event_timestamp:' || pending_rec.max_event_timestamp || ' from event'
    );

ELSE 

    CREATE TEMP TABLE tmp_cand_event_id AS (
        SELECT
            event_timestamp,
            event_id
        FROM
            {{schema}}.event e1
        WHERE
            NOT EXISTS (
                SELECT
                    1
                FROM
                    {{schema}}.event_v2 e2
                WHERE
                    e1.event_id = e2.event_id
            )
            AND event_timestamp >= n_days_ago_msec
            LIMIT 100000000
    );
    
    SELECT
        COUNT(*) INTO record_number
    FROM
        tmp_cand_event_id;
    
    CALL {{schema}}.sp_clickstream_log_non_atomic (
        log_name,
        'info',
        'select candidate event_id ' || record_number || ' from event'
    );

    IF record_number > 0 THEN
    INSERT INTO
        {{schema}}.tmp_backfill_trace (
            SELECT
                MIN(event_timestamp) min_event_timestamp,
                MAX(event_timestamp) max_event_timestamp,
                GETDATE() start_time,
                COUNT(1),
                'start' status,
                NULL
            FROM
                tmp_cand_event_id
        );
    
    END IF;

END IF;

------------------------------

SELECT
    COUNT(*) INTO record_number
FROM
    tmp_cand_event_id;

IF record_number = 0 THEN 

    CALL {{schema}}.sp_clickstream_log_non_atomic (
        log_name,
        'info',
        'backfill event_v2 is done'
    );
    
    return;

END IF;

------------------------------
-- event
INSERT INTO
    {{schema}}.event_v2(
        event_timestamp,
        event_id,
        event_time_msec,
        event_name,
        event_value,
        event_value_currency,
        event_bundle_sequence_id,
        ingest_time_msec,
        device_mobile_brand_name,
        device_mobile_model_name,
        device_manufacturer,
        device_carrier,
        device_network_type,
        device_operating_system,
        device_operating_system_version,
        device_vendor_id,
        device_advertising_id,
        device_system_language,
        device_time_zone_offset_seconds,
        device_ua_browser,
        device_ua_browser_version,
        device_ua_os,
        device_ua_os_version,
        device_ua_device,
        device_ua_device_category,
        device_screen_width,
        device_screen_height,
        device_viewport_width,
        device_viewport_height,
        geo_continent,
        geo_sub_continent,
        geo_country,
        geo_region,
        geo_metro,
        geo_city,
        geo_locale,
        traffic_source_source,
        traffic_source_medium,
        traffic_source_campaign,
        traffic_source_content,
        traffic_source_term,
        traffic_source_campaign_id,
        traffic_source_clid_platform,
        traffic_source_clid,
        traffic_source_channel_group,
        traffic_source_category,
        user_first_touch_time_msec,
        app_package_id,
        app_id,
        app_version,
        app_install_source,
        platform,
        project_id,
        user_id,
        user_pseudo_id,
        process_info
    )
SELECT
    TIMESTAMP 'epoch' + event_timestamp / 1000 * INTERVAL '1 second' AS event_timestamp,
    event_id,
    event_timestamp AS event_time_msec,
    event_name,
    event_value_in_usd AS event_value,
    'USD' AS event_value_currency,
    event_bundle_sequence_id,
    ingest_timestamp AS ingest_time_msec,
    device.mobile_brand_name::varchar,
    device.mobile_model_name::varchar,
    device.manufacturer::varchar,
    device.carrier::varchar,
    device.network_type::varchar,
    device.operating_system::varchar,
    device.operating_system_version::varchar,
    device.vendor_id::varchar,
    device.advertising_id::varchar,
    device.system_language::varchar,
    device.time_zone_offset_seconds::bigint,
    device.ua_browser::varchar,
    device.ua_browser_version::varchar,
    device.ua_os::varchar,
    device.ua_os_version::varchar,
    device.ua_device::varchar,
    device.ua_device_category::varchar,
    device.screen_width::bigint,
    device.screen_height::bigint,
    device.viewport_width::bigint,
    device.viewport_height::bigint,
    geo.continent::varchar,
    geo.sub_continent::varchar,
    geo.country::varchar,
    geo.region::varchar,
    geo.metro::varchar,
    geo.city::varchar,
    geo.locale::varchar,
    CASE
        WHEN traffic_source.source = '' THEN NULL
        ELSE traffic_source.source::varchar
    END AS traffic_source_source,
    CASE
        WHEN traffic_source.medium = '' THEN NULL
        ELSE traffic_source.medium::varchar
    END AS traffic_source_medium,
    traffic_source.campaign::varchar AS traffic_source_campaign,
    traffic_source.content::varchar AS traffic_source_content,
    traffic_source.term::varchar AS traffic_source_term,
    traffic_source.campaign_id::varchar AS traffic_source_campaign_id,
    traffic_source.clid_platform::varchar AS traffic_source_clid_platform,
    traffic_source.clid::varchar AS traffic_source_clid,
    traffic_source.channel_group::varchar AS traffic_source_channel_group,
    traffic_source.category::varchar AS traffic_source_category,
    NULL AS user_first_touch_time_msec,
    app_info.id::varchar AS app_package_id,
    app_info.app_id::varchar AS app_id,
    app_info.app_version::varchar AS app_version,
    app_info.install_source::varchar AS app_install_source,
    CASE
        WHEN platform IS NULL THEN 'Web'
        ELSE platform
    END,
    project_id,
    user_id,
    user_pseudo_id,
    object(
        'backfill_event',
        true,
        'backfill_start_time',
        getdate()::text
    ) AS process_info
FROM
    {{schema}}.event e
WHERE
    e.event_id IN (
        SELECT
            event_id
        FROM
            tmp_cand_event_id
    );

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    'insert ' || record_number || ' to event_v2'
);

------------------------------
-- event user_first_touch_time_msec

UPDATE
    {{schema}}.event_v2
SET
    user_first_touch_time_msec = u.user_first_touch_timestamp,
    process_info = object_transform(
        process_info
        SET
            '"backfill_user_first_touch_time_msec"',
            true
    )
FROM
    {{schema}}.user_m_view u
WHERE
    event_v2.user_pseudo_id = u.user_pseudo_id
    AND event_v2.event_id IN (
        SELECT
            event_id
        FROM
            tmp_cand_event_id
    );

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    'UPDATE event_v2 ' || record_number || ' for user_first_touch_time_msec'
);

------------------------------
-- event parameter
CREATE temp TABLE tmp_event_param_combined AS (
    WITH filtered_params AS (
        SELECT
            event_id,
            event_param_key AS key,
CASE
                -- WHEN event_param_string_value IS NOT NULL THEN substring(event_param_string_value, 1, 2048)
                WHEN event_param_string_value IS NOT NULL THEN event_param_string_value
                WHEN event_param_double_value IS NOT NULL THEN event_param_double_value::varchar
                WHEN event_param_int_value IS NOT NULL THEN event_param_int_value::varchar
            END AS value
        FROM
            {{schema}}.event_parameter
        WHERE
            event_param_key IN (
                SELECT
                    param_key
                FROM
                    tmp_flat_key
            )
            AND event_id IN (
                SELECT
                    event_id
                FROM
                    tmp_cand_event_id
            )
    )
    SELECT
        event_id,
        json_parse(
            {{schema}}.combine_json_list(
                '[' || listagg(json_serialize(object(key, value)), ',') || ']'
            )
        ) AS param_json
    FROM
        filtered_params
    GROUP BY
        event_id
);

CREATE temp TABLE tmp_event_param_custom AS (
    WITH filtered_params AS (
        SELECT
            event_id,
            event_param_key AS key,
            CASE
                -- WHEN event_param_string_value IS NOT NULL THEN substring(event_param_string_value, 1, 2048)
                WHEN event_param_string_value IS NOT NULL THEN object(
                    'value',
                    event_param_string_value,
                    'type',
                    'string'
                )
                WHEN event_param_double_value IS NOT NULL THEN object(
                    'value',
                    event_param_double_value::varchar,
                    'type',
                    'number'
                )
                WHEN event_param_int_value IS NOT NULL THEN object(
                    'value',
                    event_param_int_value::varchar,
                    'type',
                    'number'
                )
            END AS value
        FROM
            {{schema}}.event_parameter
        WHERE
            event_param_key NOT IN (
                SELECT
                    param_key
                FROM
                    tmp_flat_key
            )
            AND event_id IN (
                SELECT
                    event_id
                FROM
                    tmp_cand_event_id
            )
    )
    SELECT
        event_id,
        json_parse(
            {{schema}}.combine_json_list(
                '[' || listagg(json_serialize(object(key, value)), ',') || ']'
            )
        ) AS param_json
    FROM
        filtered_params
    GROUP BY
        event_id
);

UPDATE
    {{schema}}.event_v2
SET
    screen_view_screen_name = t.param_json._previous_screen_name::varchar,
    screen_view_screen_id = t.param_json._screen_id::varchar,
    screen_view_screen_unique_id = t.param_json._screen_unique_id::varchar,
    screen_view_previous_screen_name = t.param_json._previous_screen_name::varchar,
    screen_view_previous_screen_id = t.param_json._previous_screen_id::varchar,
    screen_view_previous_screen_unique_id = t.param_json._previous_screen_unique_id::varchar,
    screen_view_previous_time_msec = CASE
        WHEN event_name IN ('_screen_view') THEN t.param_json._previous_timestamp::bigint
        ELSE NULL
    END,
    screen_view_engagement_time_msec = CASE
        WHEN event_name IN ('_screen_view') THEN t.param_json._engagement_time_msec::bigint
        ELSE NULL
    END,
    screen_view_entrances = CASE
        WHEN event_name IN ('_screen_view')
        AND t.param_json._entrances::varchar IN ('true', '1') THEN true
        ELSE NULL
    END,
    page_view_page_referrer = t.param_json._page_referrer::varchar,
    page_view_page_referrer_title = t.param_json._page_referrer_title::varchar,
    page_view_previous_time_msec = CASE
        WHEN event_name IN ('_page_view') THEN t.param_json._previous_timestamp::bigint
        ELSE NULL
    END,
    page_view_engagement_time_msec = CASE
        WHEN event_name IN ('_page_view') THEN t.param_json._engagement_time_msec::bigint
        ELSE NULL
    END,
    page_view_page_title = t.param_json._page_title::varchar,
    page_view_page_url = t.param_json._page_url::varchar,
    page_view_latest_referrer = t.param_json._latest_referrer::varchar,
    page_view_latest_referrer_host = t.param_json._latest_referrer_host::varchar,
    page_view_entrances = CASE
        WHEN t.param_json._entrances::varchar IN ('true', '1') THEN true
        ELSE NULL
    END,
    upgrade_previous_app_version = t.param_json._previous_app_version::varchar,
    upgrade_previous_os_version = t.param_json._previous_os_version::varchar,
    search_key = t.param_json._search_key::varchar,
    search_term = t.param_json._search_term::varchar,
    outbound_link_classes = t.param_json._link_classes::varchar,
    outbound_link_domain = t.param_json._link_domain::varchar,
    outbound_link_id = t.param_json._link_id::varchar,
    outbound_link_url = t.param_json._link_url::varchar,
    outbound_link = CASE
        WHEN t.param_json._outbound::varchar IN ('true', '1') THEN true
        ELSE NULL
    END,
    session_id = t.param_json._session_id::varchar,
    session_start_time_msec = t.param_json._session_start_timestamp::bigint,
    session_duration = t.param_json._session_duration::bigint,
    session_number = t.param_json._session_number::bigint,
    sdk_error_code = t.param_json._error_code::varchar,
    sdk_error_message = t.param_json._error_message::varchar,
    sdk_version = t.param_json._sdk_version::varchar,
    sdk_name = t.param_json._sdk_name::varchar,
    app_exception_message = t.param_json._exception_message::varchar,
    app_exception_stack = t.param_json._exception_stack::varchar,
    app_start_is_first_time = CASE
        WHEN event_name IN ('_app_start')
        AND t.param_json._is_first_time::varchar IN ('true', '1') THEN true
        ELSE NULL
    END,
    user_engagement_time_msec = CASE
        WHEN event_name IN ('_user_engagement') THEN t.param_json._engagement_time_msec::bigint
        ELSE NULL
    END,
    scroll_engagement_time_msec = CASE
        WHEN event_name IN ('_scroll') THEN t.param_json._engagement_time_msec::bigint
        ELSE NULL
    END,
    platform = CASE
        WHEN t.param_json._page_url IS NOT NULL THEN 'Web'
        ELSE event_v2.platform
    END,
    process_info = object_transform(
        process_info
        SET
            '"backfill_event_parameters"',
            true
    )
FROM
    tmp_event_param_combined t
WHERE
    event_v2.event_id = t.event_id;

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    'UPDATE event_v2 ' || record_number || ' for flatten parameters'
);

UPDATE
    {{schema}}.event_v2
SET
    custom_parameters_json_str = {{schema}}.transform_event_custom_props(json_serialize(t.param_json)),
    custom_parameters = t.param_json,
    process_info = object_transform(
        process_info
        SET
            '"backfill_custom_parameters"',
            true
    )
FROM
    tmp_event_param_custom t
WHERE
    event_v2.event_id = t.event_id;

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    'UPDATE event_v2 ' || record_number || ' for customed parameters'
);

------------------------------
-- traffic source
CREATE temp TABLE tmp_event_traffic_source AS (
    SELECT
        event_timestamp,
        event_id,
        platform,
        page_view_latest_referrer,
        page_view_page_referrer,
        page_view_page_url,
        json_parse(
            {{schema}}.parse_utm_from_url(page_view_page_url, page_view_page_referrer)
        ) utm
    FROM
        {{schema}}.event_v2 e
    WHERE
        platform = 'Web'
        AND page_view_page_url IS NOT NULL
        AND event_id IN (
            SELECT
                event_id
            FROM
                tmp_cand_event_id
        )
    UNION
    ALL
    SELECT
        event_timestamp,
        event_id,
        platform,
        page_view_latest_referrer,
        page_view_page_referrer,
        page_view_page_url,
        json_parse(
            {{schema}}.parse_utm_from_url(page_view_latest_referrer, NULL)
        ) utm
    FROM
        {{schema}}.event_v2 e
    WHERE
        platform != 'Web'
        AND page_view_latest_referrer IS NOT NULL
        AND event_id IN (
            SELECT
                event_id
            FROM
                tmp_cand_event_id
        )
);

UPDATE
    {{schema}}.event_v2
SET
    page_view_page_url_path = utm.path::varchar,
    page_view_page_url_query_parameters = CASE
        WHEN json_serialize(utm.params::super) = '{}' THEN NULL
        ELSE utm.params::super
    END,
    page_view_hostname = utm.host::varchar,
    traffic_source_source = utm.utm_source::varchar,
    traffic_source_medium = utm.utm_medium::varchar,
    traffic_source_campaign = utm.utm_campaign::varchar,
    traffic_source_content = utm.utm_content::varchar,
    traffic_source_term = utm.utm_term::varchar,
    traffic_source_campaign_id = utm.utm_id::varchar,
    traffic_source_clid_platform = utm.utm_source_platform::varchar,
    traffic_source_clid = utm.clid_str::varchar,
    traffic_source_channel_group = utm.channel_group::varchar,
    traffic_source_category = utm.source_category::varchar,
    process_info = object_transform(
        process_info
        SET
            '"backfill_traffic_source_web"',
            true
    )
FROM
    tmp_event_traffic_source t
WHERE
    event_v2.event_id = t.event_id
    AND event_v2.platform = 'Web';

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    'UPDATE event_v2 ' || record_number || ' for traffic source - web'
);

UPDATE
    {{schema}}.event_v2
SET
    traffic_source_source = utm.utm_source::varchar,
    traffic_source_medium = utm.utm_medium::varchar,
    traffic_source_campaign = utm.utm_campaign::varchar,
    traffic_source_content = utm.utm_content::varchar,
    traffic_source_term = utm.utm_term::varchar,
    traffic_source_campaign_id = utm.utm_id::varchar,
    traffic_source_clid_platform = utm.utm_source_platform::varchar,
    traffic_source_clid = utm.clid_str::varchar,
    traffic_source_channel_group = utm.channel_group::varchar,
    traffic_source_category = utm.source_category::varchar,
    process_info = object_transform(
        process_info
        SET
            '"backfill_traffic_source_mobile"',
            true
    )
FROM
    tmp_event_traffic_source t
WHERE
    event_v2.event_id = t.event_id
    AND event_v2.platform != 'Web';

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    'UPDATE event_v2 ' || record_number || ' for traffic source - non web'
);

------------------------------
UPDATE
    {{schema}}.tmp_backfill_trace
SET
    status = 'done',
    END_time = GETDATE()
WHERE
    status = 'start';

CALL {{schema}}.sp_clickstream_log_non_atomic(
    log_name,
    'info',
    '----done---------------------------- '
);

------------------------------
-- clean up
DROP TABLE IF EXISTS tmp_flat_key;

DROP TABLE IF EXISTS tmp_cand_event_id;

DROP TABLE IF EXISTS tmp_event_param_combined;

DROP TABLE IF EXISTS tmp_event_param_custom;

DROP TABLE IF EXISTS tmp_event_traffic_source;

EXCEPTION
WHEN OTHERS THEN CALL {{schema}}.sp_clickstream_log_non_atomic(log_name, 'error', 'error message:' || SQLERRM);

END;

$$
