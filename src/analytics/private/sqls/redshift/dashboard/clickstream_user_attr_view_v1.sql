CREATE OR REPLACE VIEW {{schema}}.{{viewName}}
AS
select 
   user_id
  ,t1.user_pseudo_id
  ,user_first_touch_timestamp
  ,_first_visit_date
  ,_first_referer
  ,_first_traffic_source_type
  ,_first_traffic_medium
  ,_first_traffic_source
  ,device_id_list
  ,_channel
  ,t2.custom_attr_key
  ,t2.custom_attr_value
from {{schema}}.user_m_view t1
left join (
  select 
   user_pseudo_id
  ,eu.key::varchar as custom_attr_key
  ,coalesce (
       nullif(eu.value.string_value::varchar,'')
      ,nullif(eu.value.int_value::varchar,'')
      ,nullif(eu.value.float_value::varchar,'')
      ,nullif(eu.value.double_value::varchar,'')
      ,'null'
   )::varchar as custom_attr_value
  from {{schema}}.user_m_view u, u.user_properties eu
) t2
on t1.user_pseudo_id = t2.user_pseudo_id
;