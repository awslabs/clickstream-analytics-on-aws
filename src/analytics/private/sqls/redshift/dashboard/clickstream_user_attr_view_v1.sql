CREATE OR REPLACE VIEW {{schema}}.clickstream_user_attr_view_v1
AS
select 
   user_id
  ,user_pseudo_id
  ,user_first_touch_timestamp
  ,_first_visit_date
  ,_first_referer
  ,_first_traffic_source_type
  ,_first_traffic_medium
  ,_first_traffic_source
  ,device_id_list
  ,_channel
  , eu.key::varchar as custom_attr_key
  , coalesce (
       nullif(eu.value.string_value::varchar,'')
      ,nullif(eu.value.int_value::varchar,'')
      ,nullif(eu.value.float_value::varchar,'')
      ,nullif(eu.value.double_value::varchar,'')
   ) as custom_attr_value
from {{schema}}.user_m_view u, u.user_properties eu;