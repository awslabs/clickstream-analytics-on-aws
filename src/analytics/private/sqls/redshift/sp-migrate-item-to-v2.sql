CREATE OR REPLACE PROCEDURE {{schema}}.sp_migrate_item_to_v2() 
NONATOMIC
LANGUAGE plpgsql
AS $$

DECLARE 

record_number INT;

log_name VARCHAR(50) := 'sp_migrate_item_to_v2';

BEGIN 

DROP TABLE IF EXISTS tmp_event_item;

DROP TABLE IF EXISTS tmp_item_props_json;

DROP TABLE IF EXISTS tmp_item_custom_props;

CREATE temp TABLE tmp_event_item AS (
    WITH event_item AS (
        SELECT
            DISTINCT TIMESTAMP 'epoch' + event_timestamp / 1000 * INTERVAL '1 second' AS event_timestamp,
            event_id,
            event_name,
            platform,
            user_pseudo_id,
            user_id,
            item
        FROM
            {{schema}}.event e,
            e.items AS item
    )
    SELECT
        event_timestamp,
        event_id,
        event_name,
        platform,
        user_pseudo_id,
        user_id,
        item.id::varchar AS item_id,
        item.name::varchar AS name,
        item.brand::varchar AS brand,
        item.currency::varchar AS currency,
        item.price::double precision AS price,
        item.quantity::double precision AS quantity,
        item.creative_name::varchar AS creative_name,
        item.creative_slot::varchar AS creative_slot,
        item.location_id::varchar AS location_id,
        item.category::varchar AS category,
        item.category2::varchar AS category2,
        item.category3::varchar AS category3,
        item.category4::varchar AS category4,
        item.category5::varchar AS category5
    FROM
        event_item
);

INSERT INTO
    {{schema}}.item_v2 (
        event_timestamp,
        event_id,
        event_name,
        platform,
        user_pseudo_id,
        user_id,
        item_id,
        name,
        brand,
        currency,
        price,
        quantity,
        creative_name,
        creative_slot,
        location_id,
        category,
        category2,
        category3,
        category4,
        category5,
        process_info
    )
SELECT
    event_timestamp,
    event_id,
    event_name,
    platform,
    user_pseudo_id,
    user_id,
    item_id,
    name,
    brand,
    currency,
    price,
    quantity,
    creative_name,
    creative_slot,
    location_id,
    category,
    category2,
    category3,
    category4,
    category5,
    object(
        'backfill_event',
        true,
        'backfill_start_time',
        getdate()::text
    )
FROM
    tmp_event_item;

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic (
    log_name,
    'info',
    'insert ' || record_number || ' to item_v2'
);

CREATE temp TABLE tmp_item_props_json AS (
    WITH item_props_exploded AS (
        SELECT
            distinct event_timestamp,
            id AS item_id,
            object(
                p.key::text,
               object(
                    'value',
                    CASE
                        WHEN p.value.string_value IS NOT NULL THEN p.value.string_value
                        WHEN p.value.int_value IS NOT NULL THEN p.value.int_value
                        WHEN p.value.double_value IS NOT NULL THEN p.value.double_value
                    end,
                    'type',
                    CASE
                        WHEN p.value.string_value IS NOT NULL THEN 'string'
                        WHEN p.value.int_value IS NOT NULL THEN 'number'
                        WHEN p.value.double_value IS NOT NULL THEN 'number'
                    end
                )
            ) AS p
        FROM
            {{schema}}.item i,
            i.properties p
    ),
    item_props_flat AS (
        SELECT
            event_timestamp,
            item_id,
            '[' || listagg(json_serialize(p), ',') || ']' AS props_arr
        FROM
            item_props_exploded
        GROUP BY
            event_timestamp,
            item_id
    )
    SELECT
        event_timestamp,
        item_id,
        json_parse({{schema}}.combine_json_list(props_arr)) props
    FROM
        item_props_flat
);

update
    {{schema}}.item_v2
SET
    name = coalesce(item_v2.name, t.props.name::text),
    brand = coalesce(item_v2.brand, t.props.brand::text),
    currency = coalesce(item_v2.currency, t.props.currency::text),
    price = coalesce(item_v2.price, t.props.price::double precision),
    quantity = coalesce(
        item_v2.quantity,
        t.props.quantity::double precision
    ),
    creative_name = coalesce(
        item_v2.creative_name,
        t.props.creative_name::text
    ),
    creative_slot = coalesce(
        item_v2.creative_slot,
        t.props.creative_slot::text
    ),
    location_id = coalesce(item_v2.location_id, t.props.location_id::text),
    category = coalesce(item_v2.category, t.props.category::text),
    category2 = coalesce(item_v2.category2, t.props.category2::text),
    category3 = coalesce(item_v2.category3, t.props.category3::text),
    category4 = coalesce(item_v2.category4, t.props.category4::text),
    category5 = coalesce(item_v2.category5, t.props.category5::text),
    process_info = object_transform(
        process_info
        SET
            '"backfill_item_properties"',
            true
    )
FROM
    tmp_item_props_json t
WHERE
    item_v2.item_id = t.item_id;

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic (
    log_name,
    'info',
    'update ' || record_number || ' in item_v2 for item_properties'
);

CREATE temp TABLE tmp_item_custom_props AS (
    SELECT
        event_timestamp,
        item_id,
        custom_props_str
    FROM
        (
            SELECT
                *,
                {{schema}}.rm_object_props(
                    json_serialize(props),
                    'category,category2,category3,category4,category5,name,brand,currency,price,quantity,creative_name,creative_slot,location_id'
                ) AS custom_props_str
            FROM
                tmp_item_props_json
        ) t
    WHERE
        t.custom_props_str != '{}'
);

update
    {{schema}}.item_v2
SET
    custom_parameters_json_str = t.custom_props_str,
    custom_parameters = json_parse(t.custom_props_str),
    process_info = object_transform(
        process_info
        SET
            '"backfill_custom_parameters"',
            true
    )
FROM
    tmp_item_custom_props t
WHERE
    item_v2.item_id = t.item_id
    AND can_json_parse(t.custom_props_str);

GET DIAGNOSTICS record_number := ROW_COUNT;

CALL {{schema}}.sp_clickstream_log_non_atomic (
    log_name,
    'info',
    'update ' || record_number || ' in item_v2 for custom_parameters'
);

EXCEPTION
WHEN OTHERS THEN 

CALL {{schema}}.sp_clickstream_log_non_atomic(log_name, 'error', 'error message:' || SQLERRM);

END;

$$