CREATE MATERIALIZED VIEW {{schema}}.clickstream_ods_events_parameter_view 
BACKUP NO
SORTKEY(event_date, event_name)
AUTO REFRESH YES
AS
select 
event_id,
event_name,
event_date,
event_params.key::varchar as event_parameter_key,
coalesce (nullif(event_params.value.string_value::varchar,'')
      , nullif(event_params.value.int_value::varchar,'')
      , nullif(event_params.value.float_value::varchar,'')
      , nullif(event_params.value.double_value::varchar,'')) as event_parameter_value
from {{schema}}.ods_events e, e.event_params as event_params;