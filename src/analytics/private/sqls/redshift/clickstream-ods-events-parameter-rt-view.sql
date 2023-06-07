CREATE OR REPLACE VIEW {{schema}}.clickstream_ods_events_parameter_rt_view
AS
SELECT 
    event_id,
    event_name,
    event_date,
    event_parameter_key,
    event_parameter_value
FROM {{schema}}.clickstream_ods_events_parameter_view
WHERE EXISTS (SELECT 1 FROM {{schema}}.clickstream_ods_events_parameter_view LIMIT 1)
UNION ALL
SELECT 
    e.event_id,
    e.event_name,
    e.event_date,
    ep.key::varchar as event_parameter_key,
    coalesce (ep.value.string_value
        , ep.value.int_value
        , ep.value.float_value
        , ep.value.double_value)::varchar as event_parameter_value
FROM {{schema}}.ods_events e, e.event_params as ep
WHERE e.event_date > (SELECT max(event_date) FROM {{schema}}.clickstream_ods_events_parameter_view)
AND EXISTS (SELECT 1 FROM {{schema}}.clickstream_ods_events_parameter_view LIMIT 1)
UNION ALL
SELECT 
    e.event_id,
    e.event_name,
    e.event_date,
    ep.key::varchar as event_parameter_key,
    coalesce (ep.value.string_value
        , ep.value.int_value
        , ep.value.float_value
        , ep.value.double_value)::varchar as event_parameter_value
FROM {{schema}}.ods_events e, e.event_params as ep
WHERE NOT EXISTS (SELECT 1 FROM {{schema}}.clickstream_ods_events_parameter_view LIMIT 1);