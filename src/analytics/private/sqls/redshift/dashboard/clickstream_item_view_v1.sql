CREATE OR REPLACE VIEW {{scheam}}.clickstream_item_view_v1 AS
SELECT 
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
  custom_parameters_json_str
FROM {{schema}}.item_v2