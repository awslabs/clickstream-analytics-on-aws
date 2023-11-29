CREATE
OR REPLACE PROCEDURE {{schema}}.sp_migrate_ods_events_1_0_to_1_1() 
NONATOMIC 
AS 
$$ 


DECLARE 

record_number INT;
log_name VARCHAR(50) := 'sp_migrate_ods_events';

BEGIN 

DROP TABLE IF EXISTS ods_events_params_candidate;
DROP TABLE IF EXISTS item_all_temp;
DROP TABLE IF EXISTS ods_events_item_candidate;
DROP TABLE IF EXISTS item_final_temp;
DROP TABLE IF EXISTS ods_events_user_temp;
DROP TABLE IF EXISTS user_traffic_source_temp;
DROP TABLE IF EXISTS user_base_temp;
DROP TABLE IF EXISTS user_page_referrer_temp;
DROP TABLE IF EXISTS user_device_id_list_temp;
DROP TABLE IF EXISTS user_final_temp;
DROP TABLE IF EXISTS user_channel_temp;

--------------------------------
-- backfill table: event
--------------------------------
INSERT INTO
       {{schema}}.{{table_event}} (
              SELECT
                     event_id,
                     event_date,
                     event_timestamp,
                     event_previous_timestamp,
                     event_name,
                     event_value_in_usd,
                     event_bundle_sequence_id,
                     ingest_timestamp,
                     device,
                     geo,
                     traffic_source,
                     app_info,
                     platform,
                     project_id,
                     items,
                     user_pseudo_id,
                     user_id
              FROM
                     {{schema}}.{{table_ods_events}} e
              WHERE
                     NOT EXISTS (
                            SELECT
                                   1
                            FROM
                                   {{schema}}.{{table_event}} e2
                            WHERE
                                   e.event_id = e2.event_id
                                   AND e.event_date = e2.event_date
                                   AND e.event_timestamp = e2.event_timestamp
                     )
       );

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(
       log_name,
       'info',
       'insert ' || record_number || ' FROM {{schema}}.{{table_event}}'
);

ANALYZE {{schema}}.{{table_event}};

--------------------------------
-- backfill table: event_parameter
--------------------------------
-- ods_events_params_candidate

SELECT
       event_timestamp,
       event_id,
       event_name,
       event_params INTO temp ods_events_params_candidate
FROM
       {{schema}}.{{table_ods_events}} e
WHERE
       NOT EXISTS (
              SELECT
                     1
              FROM
                     {{schema}}.{{table_event_parameter}} e2
              WHERE
                     e.event_id = e2.event_id
                     AND e.event_timestamp = e2.event_timestamp
       );

INSERT INTO
       {{schema}}.{{table_event_parameter}}(
              SELECT
                     event_timestamp,
                     event_id,
                     event_name,
                     ep.key :: VARCHAR AS event_param_key,
                     ep.value.double_value :: DOUBLE PRECISION AS event_param_double_value,
                     ep.value.float_value :: DOUBLE PRECISION AS event_param_float_value,
                     ep.value.int_value :: BIGINT AS event_param_int_value,
                     ep.value.string_value :: VARCHAR AS event_param_string_value
              FROM
                     ods_events_params_candidate e,
                     e.event_params AS ep
       );

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(
       log_name,
       'info',
       'insert ' || record_number || ' FROM {{schema}}.{{table_event_parameter}}'
);

DROP TABLE ods_events_params_candidate;

ANALYZE {{schema}}.{{table_event_parameter}};

--------------------------------
-- backfill table: item
--------------------------------

-- item_all_temp

WITH item_all_with_id AS (
       SELECT
              e.event_timestamp,
              it.id :: VARCHAR AS id,
              e.items
       FROM
              {{schema}}.{{table_ods_events}} e,
              e.items AS it
)
SELECT
       * INTO temp item_all_temp
FROM
       item_all_with_id;

-- ods_events_item_candidate

SELECT
       event_timestamp,
       items INTO temp ods_events_item_candidate
FROM
       item_all_temp e
WHERE
       NOT EXISTS (
              SELECT
                     1
              FROM
                     {{schema}}.{{table_item}} it2
              WHERE
                     e.id = it2.id
       );


-- item_final_temp

WITH item_rank AS (
       SELECT
              e.event_timestamp,
              it.id :: VARCHAR AS id,
              array(
                     object(
                            'key',
                            'brand',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   it.brand
                            )
                     ),
                     object(
                            'key',
                            'category',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   it.category
                            )
                     ),
                     object(
                            'key',
                            'category2',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   it.category2
                            )
                     ),
                     object(
                            'key',
                            'category3',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   it.category3
                            )
                     ),
                     object(
                            'key',
                            'category4',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   it.category4
                            )
                     ),
                     object(
                            'key',
                            'category5',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   it.category5
                            )
                     ),
                     object(
                            'key',
                            'creative_name',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   it.creative_name
                            )
                     ),
                     object(
                            'key',
                            'creative_slot',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   it.creative_slot
                            )
                     ),
                     object(
                            'key',
                            'location_id',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   it.location_id
                            )
                     ),
                     object(
                            'key',
                            'name',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   it.name
                            )
                     ),
                     object(
                            'key',
                            'price',
                            'value',
                            object(
                                   'double_value',
                                   it.price,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   null
                            )
                     ),
                     object(
                            'key',
                            'currency',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   null,
                                   'string_value',
                                   it.currency
                            )
                     ),
                     object(
                            'key',
                            'quantity',
                            'value',
                            object(
                                   'double_value',
                                   null,
                                   'float_value',
                                   null,
                                   'int_value',
                                   it.quantity,
                                   'string_value',
                                   null
                            )
                     )
              ) AS properties,
              ROW_NUMBER() OVER (
                     PARTITION BY it.id :: VARCHAR
                     ORDER BY
                            event_timestamp DESC
              ) AS et_rank
       FROM
              ods_events_item_candidate e,
              e.items AS it
),
item_final AS (
       SELECT
              event_timestamp,
              id,
              properties
       FROM
              item_rank
       WHERE
              et_rank = 1
)
SELECT
       * INTO temp item_final_temp
FROM
       item_final;

INSERT INTO
       {{schema}}.{{table_item}} (
              SELECT
                     *
              FROM
                     item_final_temp it
              WHERE
                     NOT EXISTS (
                            SELECT
                                   1
                            FROM
                                   {{schema}}.{{table_item}} it2
                            WHERE
                                   it.id = it2.id
                     )
       );

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(
       log_name,
       'info',
       'insert ' || record_number || ' FROM {{schema}}.{{table_item}}'
);

DROP TABLE item_all_temp;
DROP TABLE item_final_temp;
DROP TABLE ods_events_item_candidate;

ANALYZE {{schema}}.{{table_item}};

--------------------------------
-- backfill table: user
--------------------------------
-- ods_events_user_temp

SELECT
       event_timestamp,
       event_id,
       event_name,
       user_id,
       user_pseudo_id,
       user_first_touch_timestamp,
       user_properties,
       user_ltv,
       app_info,
       traffic_source,
       device,
       event_params INTO temp ods_events_user_temp
FROM
       {{schema}}.{{table_ods_events}} e
WHERE
       e.event_name IN ('_first_open', '_first_visit', '_profile_set', '_app_end', '_app_start')
       AND NOT EXISTS (
              SELECT
                     1
              FROM
                     {{schema}}.{{table_user}} u2
              WHERE
                     e.user_pseudo_id = u2.user_pseudo_id
       );


-- user_base_temp

WITH user_base_rank AS (
       SELECT
              event_timestamp,
              user_id,
              user_pseudo_id,
              user_first_touch_timestamp,
              user_properties,
              user_ltv,
              CAST(
                     TIMESTAMP 'epoch' + (user_first_touch_timestamp / 1000) * INTERVAL '1 second' AS date
              ) AS _first_visit_date,
              ROW_NUMBER() OVER (
                     PARTITION BY user_pseudo_id
                     ORDER BY
                            event_timestamp DESC
              ) AS et_rank
       FROM
              ods_events_user_temp e
       WHERE  e.event_name IN ('_first_open', '_first_visit', '_profile_set')
),
user_base AS (
       SELECT
              event_timestamp,
              user_id,
              user_pseudo_id,
              user_first_touch_timestamp,
              user_properties,
              user_ltv,
              _first_visit_date
       FROM
              user_base_rank
       WHERE
              et_rank = 1
)
SELECT
       * INTO temp user_base_temp
FROM
       user_base;

-- user_traffic_source_temp 

WITH user_traffic_source_rank AS (
       SELECT
              user_pseudo_id,
              traffic_source.medium :: VARCHAR AS medium,
              traffic_source.name :: VARCHAR AS name,
              traffic_source.source :: VARCHAR AS source,
              ROW_NUMBER() OVER (
                     PARTITION BY user_pseudo_id
                     ORDER BY
                            event_timestamp ASC
              ) AS et_rank
       FROM
              ods_events_user_temp
       WHERE
              source IS NOT NULL
              AND event_name = '_app_end'
),
user_traffic_source AS (
       SELECT
              user_pseudo_id,
              medium AS _first_traffic_medium,
              name AS _first_traffic_source_type,
              source AS _first_traffic_source
       FROM
              user_traffic_source_rank
       WHERE
              et_rank = 1
)
SELECT
       * INTO temp user_traffic_source_temp
FROM
       user_traffic_source;

-- user_page_referrer_temp

WITH user_page_referrer_rank AS (
       SELECT
              user_pseudo_id,
              ep.value.string_value :: VARCHAR AS page_referrer,
              ROW_NUMBER() OVER (
                     PARTITION BY user_pseudo_id
                     ORDER BY
                            event_timestamp ASC
              ) AS et_rank
       FROM
              ods_events_user_temp e,
              e.event_params AS ep
       WHERE
              ep.key in ('_page_referrer', '_page_referer')
              AND ep.value.string_value IS NOT NULL
              AND e.event_name IN ('_first_open', '_first_visit', '_profile_set')
),
user_page_referrer AS (
       SELECT
              user_pseudo_id,
              page_referrer AS _first_referer
       FROM
              user_page_referrer_rank
       WHERE
              et_rank = 1
)
SELECT
       * INTO temp user_page_referrer_temp
FROM
       user_page_referrer;

-- user_device_id_list_temp

WITH user_device_id_list AS (
       SELECT
              user_pseudo_id,
              split_to_array(
                     LISTAGG(DISTINCT device.vendor_id :: VARCHAR, ',') WITHIN GROUP (
                            ORDER BY
                                   device.vendor_id
                     ),
                     ','
              ) AS device_id_list
       FROM
              ods_events_user_temp
       WHERE
              device.vendor_id IS NOT NULL
       GROUP BY
              user_pseudo_id
)
SELECT
       * INTO temp user_device_id_list_temp
FROM
       user_device_id_list;


-- user_channel_temp

WITH user_channel_rank AS (
       SELECT
              user_pseudo_id,
              e.app_info.install_source :: VARCHAR AS _channel,
              ROW_NUMBER() OVER (
                     PARTITION BY user_pseudo_id
                     ORDER BY
                            event_timestamp ASC
              ) AS et_rank
       FROM
              ods_events_user_temp e
       WHERE
              _channel IS NOT NULL
              AND e.event_name IN ('_first_open', '_first_visit', '_profile_set')
),
user_channel AS (
       SELECT
              user_pseudo_id,
              _channel
       FROM
              user_channel_rank
       WHERE
              et_rank = 1
)
SELECT
       * INTO temp user_channel_temp
FROM
       user_channel;

-- user_final_temp

WITH user_final AS (
       SELECT
              u.event_timestamp,
              u.user_id,
              u.user_pseudo_id,
              u.user_first_touch_timestamp,
              u.user_properties,
              u.user_ltv,
              u._first_visit_date,
              pr._first_referer,
              ts._first_traffic_source_type,
              ts._first_traffic_medium,
              ts._first_traffic_source,
              de.device_id_list,
              uc._channel
       FROM
              user_base_temp u
              LEFT OUTER JOIN user_traffic_source_temp ts ON u.user_pseudo_id = ts.user_pseudo_id
              LEFT OUTER JOIN user_page_referrer_temp pr ON u.user_pseudo_id = pr.user_pseudo_id
              LEFT OUTER JOIN user_device_id_list_temp de ON u.user_pseudo_id = de.user_pseudo_id
              LEFT OUTER JOIN user_channel_temp uc ON u.user_pseudo_id = uc.user_pseudo_id
)
SELECT
       * INTO temp user_final_temp
FROM
       user_final;


INSERT INTO
       {{schema}}.{{table_user}} (
              SELECT
                     *
              FROM
                     user_final_temp u
              WHERE
                     NOT EXISTS (
                            SELECT
                                   1
                            FROM
                                   {{schema}}.{{table_user}} u2
                            WHERE
                                   u.user_pseudo_id = u2.user_pseudo_id
                     )
       );

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(
       log_name,
       'info',
       'insert ' || record_number || ' FROM {{schema}}.{{table_user}}'
);


DROP TABLE ods_events_user_temp;

DROP TABLE user_base_temp;

DROP TABLE user_traffic_source_temp;

DROP TABLE user_page_referrer_temp;

DROP TABLE user_device_id_list_temp;

DROP TABLE user_channel_temp;

DROP TABLE user_final_temp;

ANALYZE {{schema}}.{{table_user}};

REFRESH MATERIALIZED VIEW {{schema}}.user_m_view;
REFRESH MATERIALIZED VIEW {{schema}}.item_m_view;  

EXCEPTION
WHEN OTHERS THEN CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'error', 'error message:' || SQLERRM);

END;

$$ LANGUAGE plpgsql;
