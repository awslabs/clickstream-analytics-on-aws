CREATE OR REPLACE VIEW {{schema}}.clickstream_ods_flattened_view AS
SELECT
    TO_DATE("e"."event_date", CAST('YYYYMMDD' AS TEXT)) AS "event_date",
    "e"."event_name" AS "event_name",
    "e"."event_id" AS "event_id",
    "e"."event_bundle_sequence_id" AS "event_bundle_sequence_id",
    CAST("event_params"."key" AS VARCHAR) AS "event_parameter_key",
    COALESCE(
        CASE
        WHEN (
            CAST("event_params"."value"."string_value" AS VARCHAR) = CAST('' AS TEXT)
        ) THEN CAST(
            NULL AS
                VARCHAR
        )
        ELSE CAST("event_params"."value"."string_value" AS VARCHAR) END,
        CASE
        WHEN (
            CAST("event_params"."value"."int_value" AS VARCHAR) = CAST('' AS TEXT)
        ) THEN CAST(
            NULL AS
                VARCHAR
        )
        ELSE CAST("event_params"."value"."int_value" AS VARCHAR) END,
        CASE
        WHEN (
            CAST("event_params"."value"."float_value" AS VARCHAR) = CAST('' AS TEXT)
        ) THEN CAST(
            NULL AS
                VARCHAR
        )
        ELSE CAST("event_params"."value"."float_value" AS VARCHAR) END,
        CASE
        WHEN (
            CAST("event_params"."value"."double_value" AS VARCHAR) = CAST('' AS TEXT)
        ) THEN CAST(
            NULL AS
                VARCHAR
        )
        ELSE CAST("event_params"."value"."double_value" AS VARCHAR) END
    ) AS "event_parameter_value",
    "e"."event_previous_timestamp" AS "event_previous_timestamp",
    "e"."event_server_timestamp_offset" AS "event_server_timestamp_offset",
    "e"."event_timestamp" AS "event_timestamp",
    "e"."ingest_timestamp" AS "ingest_timestamp",
    "e"."event_value_in_usd" AS "event_value_in_usd",
    CAST("e"."app_info"."app_id" AS VARCHAR) AS "app_info_app_id",
    CAST("e"."app_info"."version" AS VARCHAR) AS "app_info_version",
    CAST("e"."device"."browser" AS VARCHAR) AS "device_browser",
    CAST("e"."device"."browser_version" AS VARCHAR) AS "device_browser_version",
    CAST("e"."device"."language" AS VARCHAR) AS "device_language",
    CAST("e"."device"."mobile_brand_name" AS VARCHAR) AS "device_mobile_brand_name",
    CAST("e"."device"."mobile_model_name" AS VARCHAR) AS "device_mobile_model_name",
    CAST("e"."device"."operating_system" AS VARCHAR) AS "device_operating_system",
    CAST("e"."device"."time_zone_offset_seconds" AS INT4) AS "device_time_zone_offset_seconds",
    CAST("e"."device"."web_info" AS VARCHAR) AS "device_web_info",
    CAST("e"."geo"."continent" AS VARCHAR) AS "geo_continent",
    CAST("e"."geo"."country" AS VARCHAR) AS "geo_country",
    CAST("e"."geo"."city" AS VARCHAR) AS "geo_city",
    "e"."platform" AS "platform",
    "e"."project_id" AS "project_id",
    CAST("e"."traffic_source"."name" AS VARCHAR) AS "traffic_source_name",
    CAST("e"."traffic_source"."meidum" AS VARCHAR) AS "traffic_source_meidum",
    CAST("e"."traffic_source"."source" AS VARCHAR) AS "traffic_source_source",
    "e"."user_first_touch_timestamp" AS "user_first_touch_timestamp",
    "e"."user_id" AS "user_id",
    "e"."user_pseudo_id" AS "user_pseudo_id"
FROM
    {{schema}}.{{table_ods_events}} AS "e",
    "e"."event_params" AS "event_params"