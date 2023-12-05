-- run following command to load latest partition
-- msck repair table {{database}}.{{userTable}};

with user_pseudo_id_rank as
(
	select  
    *
	  ,ROW_NUMBER() over (partition by user_pseudo_id ORDER BY event_timestamp desc) AS et_rank
	from {{database}}.{{userTable}}
  where partition_app = ? 
    and partition_year >= ?
    and partition_month >= ?
    and partition_day >= ?
), 
user_new as
(
	select 
    *
	from user_pseudo_id_rank
	where et_rank = 1
)
select  
   user_id
  ,user_pseudo_id
  ,user_first_touch_timestamp
  ,user_properties
  ,user_ltv
  ,_first_visit_date
  ,_first_referer
  ,_first_traffic_source_type
  ,_first_traffic_medium
  ,_first_traffic_source
  ,device_id_list
  ,_channel
  ,event_timestamp
  ,eu.key as custom_attr_key
  ,coalesce (
    nullif(eu.value.string_value,'')
    ,nullif(cast(eu.value.int_value as varchar),'')
    ,nullif(cast(eu.value.float_value as varchar),'')
    ,nullif(cast(eu.value.double_value as varchar),'')
  ) as custom_attr_value
FROM user_new cross join unnest(user_properties) as t(eu)