CREATE
OR REPLACE VIEW {{schema}}.clickstream_session_view AS
SELECT
    "session"."session_id" AS "session_id",
    "session"."user_pseudo_id" AS "user_pseudo_id",
    "session"."platform" AS "platform",
    "session"."session_duration" AS "session_duration",
    "session"."session_views" AS "session_views",
    "session"."engaged_session" AS "engaged_session",
    "session"."bounced_session" AS "bounced_session",
    "session"."session_start_timestamp" AS "session_start_timestamp",
    ROUND(
        (
            (
                (1.0 * "session"."session_engagement_time") / CAST(1000 AS INT4)
            ) / CAST(60 AS INT4)
        ),
        CAST(2 AS INT4)
    ) AS "session_engagement_time_min",
    DATE_TRUNC(
        CAST('day' AS TEXT),
        (
            CAST('1970-01-01 00:00:00' AS TIMESTAMP) + (
                (
                    "session"."session_start_timestamp" / CAST(1000 AS INT4)
                ) * CAST('00:00:01' AS INTERVAL)
            )
        )
    ) AS "session_date",
    DATE_TRUNC(
        CAST('hour' AS TEXT),
        (
            CAST('1970-01-01 00:00:00' AS TIMESTAMP) + (
                (
                    "session"."session_start_timestamp" / CAST(1000 AS INT4)
                ) * CAST('00:00:01' AS INTERVAL)
            )
        )
    ) AS "session_date_hour",
    CAST("session_f_l_sv_view"."first_sv_view" AS VARCHAR) AS "entry_view",
    CAST("session_f_l_sv_view"."last_sv_view" AS VARCHAR) AS "exit_view"
FROM
    (
        SELECT
            CAST("es"."session_id" AS VARCHAR) AS "session_id",
            "es"."user_pseudo_id" AS "user_pseudo_id",
            "es"."platform" AS "platform",
            MAX("es"."session_duration") AS "session_duration",
            CASE
            WHEN (
                (MAX("es"."session_duration") > CAST(10000 AS INT4))
                OR (SUM("es"."view") > CAST(1 AS INT4))
            ) THEN CAST(1 AS INT4)
            ELSE CAST(0 AS INT4) END AS "engaged_session",
            CASE
            WHEN (
                (MAX("es"."session_duration") > CAST(10000 AS INT4))
                OR (SUM("es"."view") > CAST(1 AS INT4))
            ) THEN CAST(0 AS INT4)
            ELSE CAST(1 AS INT4) END AS "bounced_session",
            MIN("es"."session_st") AS "session_start_timestamp",
            SUM("es"."view") AS "session_views",
            SUM("es"."engagement_time") AS "session_engagement_time"
        FROM
            (
                SELECT
                    "ods"."user_pseudo_id" AS "user_pseudo_id",
                    "ods"."event_id" AS "event_id",
                    "ods"."platform" AS "platform",
                    (
                        SELECT
                            "ep"."value"."string_value" AS "value"
                        FROM
                            {{schema}}.{{table_ods_events}} AS "e",
                            "e"."event_params" AS "ep"
                        WHERE
                            ("ep"."key" = CAST('_session_id' AS VARCHAR))
                            AND ("e"."event_id" = "ods"."event_id")
                    ) AS "session_id",
                    (
                        SELECT
                            CAST("ep_1"."value"."int_value" AS INT4) AS "value"
                        FROM
                            {{schema}}.{{table_ods_events}} AS "e_1",
                            "e_1"."event_params" AS "ep_1"
                        WHERE
                            ("ep_1"."key" = CAST('_session_duration' AS VARCHAR))
                            AND ("e_1"."event_id" = "ods"."event_id")
                    ) AS "session_duration",
                    (
                        SELECT
                            CAST("ep_2"."value"."int_value" AS INT8) AS "value"
                        FROM
                            {{schema}}.{{table_ods_events}} AS "e_2",
                            "e_2"."event_params" AS "ep_2"
                        WHERE
                            (
                                "ep_2"."key" = CAST('_session_start_timestamp' AS VARCHAR)
                            )
                            AND ("e_2"."event_id" = "ods"."event_id")
                    ) AS "session_st",
                    (
                        SELECT
                            CAST("ep_3"."value"."int_value" AS INT4) AS "value"
                        FROM
                            {{schema}}.{{table_ods_events}} AS "e_3",
                            "e_3"."event_params" AS "ep_3"
                        WHERE
                            (
                                (
                                    "ep_3"."key" = CAST('_engagement_time_msec' AS VARCHAR)
                                )
                                AND (
                                    "e_3"."event_name" = CAST('_user_engagement' AS TEXT)
                                )
                            )
                            AND ("e_3"."event_id" = "ods"."event_id")
                    ) AS "engagement_time",
                    CASE
                    WHEN (
                        ("ods"."event_name" = CAST('_screen_view' AS TEXT))
                        OR ("ods"."event_name" = CAST('_page_view' AS TEXT))
                    ) THEN CAST(1 AS INT4)
                    ELSE CAST(0 AS INT4) END AS "view"
                FROM
                    {{schema}}.{{table_ods_events}} AS "ods"
            ) AS "es"
        GROUP BY
            CAST("es"."session_id" AS VARCHAR),
            "es"."user_pseudo_id",
            "es"."platform"
    ) AS "session"
    LEFT JOIN (
        SELECT
            "session_f_sv_view"."session_id" AS "session_id",
            "session_f_sv_view"."first_sv_event_id" AS "first_sv_event_id",
            "session_f_sv_view"."last_sv_event_id" AS "last_sv_event_id",
            "session_f_sv_view"."count" AS "count",
            "session_f_sv_view"."event_id" AS "event_id",
            "session_f_sv_view"."first_sv_view" AS "first_sv_view",
            "t"."event_id" AS "event_id",
            "t"."last_sv_view" AS "last_sv_view"
        FROM
            (
                SELECT
                    "session_f_l_sv"."session_id" AS "session_id",
                    "session_f_l_sv"."first_sv_event_id" AS "first_sv_event_id",
                    "session_f_l_sv"."last_sv_event_id" AS "last_sv_event_id",
                    "session_f_l_sv"."count" AS "count",
                    "t_1"."event_id" AS "event_id",
                    "t_1"."first_sv_view" AS "first_sv_view"
                FROM
                    (
                        SELECT
                            "derived_table2"."session_id" AS "session_id",
                            "derived_table2"."first_sv_event_id" AS "first_sv_event_id",
                            "derived_table2"."last_sv_event_id" AS "last_sv_event_id",
                            COUNT("derived_table2"."event_id") AS "count"
                        FROM
                            (
                                SELECT
                                    CAST("derived_table1"."session_id" AS VARCHAR) AS "session_id",
                                    "derived_table1"."event_id" AS "event_id",
                                    FIRST_VALUE("derived_table1"."event_id") OVER (
                                        PARTITION BY "derived_table1"."session_id"
                                        ORDER BY
                                            "derived_table1"."event_timestamp" ASC NULLS LAST ROWS BETWEEN UNBOUNDED PRECEDING
                                            AND UNBOUNDED FOLLOWING
                                    ) AS "first_sv_event_id",
                                    LAST_VALUE("derived_table1"."event_id") OVER (
                                        PARTITION BY "derived_table1"."session_id"
                                        ORDER BY
                                            "derived_table1"."event_timestamp" ASC NULLS LAST ROWS BETWEEN UNBOUNDED PRECEDING
                                            AND UNBOUNDED FOLLOWING
                                    ) AS "last_sv_event_id"
                                FROM
                                    (
                                        SELECT
                                            "e_4"."event_name" AS "event_name",
                                            "e_4"."event_id" AS "event_id",
                                            "e_4"."event_timestamp" AS "event_timestamp",
                                            "ep_4"."value"."string_value" AS "session_id"
                                        FROM
                                            {{schema}}.{{table_ods_events}} AS "e_4",
                                            "e_4"."event_params" AS "ep_4"
                                        WHERE
                                            (
                                                ("e_4"."event_name" = CAST('_screen_view' AS TEXT))
                                                OR ("e_4"."event_name" = CAST('_page_view' AS TEXT))
                                            )
                                            AND ("ep_4"."key" = CAST('_session_id' AS VARCHAR))
                                    ) AS "derived_table1"
                            ) AS "derived_table2"
                        GROUP BY
                            "derived_table2"."session_id",
                            "derived_table2"."first_sv_event_id",
                            "derived_table2"."last_sv_event_id"
                    ) AS "session_f_l_sv"
                    LEFT JOIN (
                        SELECT
                            "e_5"."event_id" AS "event_id",
                            "ep_5"."value"."string_value" AS "first_sv_view"
                        FROM
                            {{schema}}.{{table_ods_events}} AS "e_5",
                            "e_5"."event_params" AS "ep_5"
                        WHERE
                            ("ep_5"."key" = CAST('_screen_name' AS VARCHAR))
                            OR ("ep_5"."key" = CAST('_page_title' AS VARCHAR))
                    ) AS "t_1" ON "session_f_l_sv"."first_sv_event_id" = "t_1"."event_id"
            ) AS "session_f_sv_view"
            LEFT JOIN (
                SELECT
                    "e_6"."event_id" AS "event_id",
                    "ep_6"."value"."string_value" AS "last_sv_view"
                FROM
                    {{schema}}.{{table_ods_events}} AS "e_6",
                    "e_6"."event_params" AS "ep_6"
                WHERE
                    ("ep_6"."key" = CAST('_screen_name' AS VARCHAR))
                    OR ("ep_6"."key" = CAST('_page_title' AS VARCHAR))
            ) AS "t" ON "session_f_sv_view"."last_sv_event_id" = "t"."event_id"
    ) AS "session_f_l_sv_view" ON "session"."session_id" = "session_f_l_sv_view"."session_id"