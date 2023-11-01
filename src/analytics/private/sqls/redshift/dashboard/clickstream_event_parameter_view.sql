CREATE MATERIALIZED VIEW {{schema}}.clickstream_event_parameter_view{{viewVersion}}
BACKUP NO
SORTKEY(event_date, event_name)
AUTO REFRESH YES
AS
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
from {{schema}}.event
join {{schema}}.event_parameter on event.event_timestamp = event_parameter.event_timestamp and event.event_id = event_parameter.event_id
;