select 
  event_id,
  event_name,
  event_date,
  params.key as event_parameter_key,
  coalesce (nullif(params.value.string_value, '')
  ,nullif(cast(params.value.int_value as varchar), '')
  ,nullif(cast(params.value.float_value as varchar),'')
  ,nullif(cast(params.value.double_value as varchar),'')) as event_parameter_value
from {{database}}.{{eventTable}} cross join unnest(event_params) as t(params)
where partition_app = ? 
  and partition_year >= ?
  and partition_month >= ?
  and partition_day >= ?