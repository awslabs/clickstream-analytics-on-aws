-- run following command to load latest partition
-- msck repair table {{database}}.{{eventTable}};
-- msck repair table {{database}}.{{eventParamTable}};

select 
  event.event_id,
  event.event_name,
  event.event_date,
  event.platform,
  event.user_id,
  event.user_pseudo_id,
  event.event_timestamp,
  event_parameter.event_param_key,
  event_parameter.event_param_double_value,
  event_parameter.event_param_float_value,
  event_parameter.event_param_int_value,
  event_parameter.event_param_string_value
from {{database}}.{{eventTable}} as event
join {{database}}.{{eventParamTable}} as event_parameter 
on event.event_timestamp = event_parameter.event_timestamp and event.event_id = event_parameter.event_id
where event.partition_app = ? 
  and event.partition_year >= ?
  and event.partition_month >= ?
  and event.partition_day >= ?
;