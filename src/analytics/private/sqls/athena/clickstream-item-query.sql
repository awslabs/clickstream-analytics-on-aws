-- run following command to load latest partition
-- msck repair table {{database}}.event_v2;
-- msck repair table {{database}}.user_v2;
-- msck repair table {{database}}.item_v2;
-- msck repair table {{database}}.session;

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
    custom_parameters_json_str,
    custom_parameters
FROM 
  {{database}}.item_v2
where partition_app = ? 
  and partition_year >= ?
  and partition_month >= ?
  and partition_day >= ?
