CREATE
OR REPLACE VIEW {{schema}}.clickstream_user_dim_view AS
SELECT
    "upid"."user_pseudo_id" AS "user_pseudo_id",
    "upid"."user_id" AS "user_id",
    "upid"."first_visit_date" AS "first_visit_date",
    "upid"."first_visit_install_source" AS "first_visit_install_source",
    "upid"."first_visit_device_language" AS "first_visit_device_language",
    "upid"."first_platform" AS "first_platform",
    "upid"."first_visit_country" AS "first_visit_country",
    "upid"."first_visit_city" AS "first_visit_city",
    "upid"."first_traffic_source_source" AS "first_traffic_source_source",
    "upid"."first_traffic_source_medium" AS "first_traffic_source_medium",
    "upid"."first_traffic_source_name" AS "first_traffic_source_name",
    "upid"."custom_attr_key" AS "custom_attr_key",
    "upid"."custom_attr_value" AS "custom_attr_value",
    CASE
    WHEN ("uid"."user_id_count" > CAST(0 AS INT4)) THEN CAST('Registered' AS TEXT)
    ELSE CAST('Non-registered' AS TEXT) END AS "is_registered"
FROM
    (
        SELECT
            "e"."user_pseudo_id" AS "user_pseudo_id",
            "e"."user_id" AS "user_id",
            TO_DATE("e"."event_date", CAST('YYYYMMDD' AS TEXT)) AS "first_visit_date",
            CAST("e"."app_info"."install_source" AS VARCHAR) AS "first_visit_install_source",
            CAST("e"."device"."system_language" AS VARCHAR) AS "first_visit_device_language",
            "e"."platform" AS "first_platform",
            CAST("e"."geo"."country" AS VARCHAR) AS "first_visit_country",
            CAST("e"."geo"."city" AS VARCHAR) AS "first_visit_city",
            CASE
            WHEN CASE
            WHEN (
                CAST("e"."traffic_source"."source" AS VARCHAR) = CAST('' AS TEXT)
            ) THEN CAST(
                NULL AS
                    VARCHAR
            )
            ELSE CAST("e"."traffic_source"."source" AS VARCHAR) END IS NULL THEN CAST('(direct)' AS VARCHAR)
            ELSE CAST("e"."traffic_source"."source" AS VARCHAR) END AS "first_traffic_source_source",
            CAST("e"."traffic_source"."medium" AS VARCHAR) AS "first_traffic_source_medium",
            CAST("e"."traffic_source"."name" AS VARCHAR) AS "first_traffic_source_name",
            CAST("eu"."key" AS VARCHAR) AS "custom_attr_key",
            COALESCE(
                CASE
                WHEN (
                    CAST("eu"."value"."string_value" AS VARCHAR) = CAST('' AS TEXT)
                ) THEN CAST(
                    NULL AS
                        VARCHAR
                )
                ELSE CAST("eu"."value"."string_value" AS VARCHAR) END,
                CASE
                WHEN (
                    CAST("eu"."value"."int_value" AS VARCHAR) = CAST('' AS TEXT)
                ) THEN CAST(
                    NULL AS
                        VARCHAR
                )
                ELSE CAST("eu"."value"."int_value" AS VARCHAR) END,
                CASE
                WHEN (
                    CAST("eu"."value"."float_value" AS VARCHAR) = CAST('' AS TEXT)
                ) THEN CAST(
                    NULL AS
                        VARCHAR
                )
                ELSE CAST("eu"."value"."float_value" AS VARCHAR) END,
                CASE
                WHEN (
                    CAST("eu"."value"."double_value" AS VARCHAR) = CAST('' AS TEXT)
                ) THEN CAST(
                    NULL AS
                        VARCHAR
                )
                ELSE CAST("eu"."value"."double_value" AS VARCHAR) END
            ) AS "custom_attr_value"
        FROM
            {{schema}}.{{table_ods_events}} AS "e",
            "e"."user_properties" AS "eu"
        WHERE
            ("e"."event_name" = CAST('_first_open' AS TEXT))
            OR ("e"."event_name" = CAST('_first_visit' AS TEXT))
    ) AS "upid"
    LEFT JOIN (
        SELECT
            "ods"."user_pseudo_id" AS "user_pseudo_id",
            COUNT(DISTINCT "ods"."user_id") AS "user_id_count"
        FROM
            {{schema}}.{{table_ods_events}} AS "ods"
        WHERE
            ("ods"."event_name" <> CAST('_first_open' AS TEXT))
            AND ("ods"."event_name" <> CAST('_first_visit' AS TEXT))
        GROUP BY
            "ods"."user_pseudo_id"
    ) AS "uid" ON "upid"."user_pseudo_id" = "uid"."user_pseudo_id"