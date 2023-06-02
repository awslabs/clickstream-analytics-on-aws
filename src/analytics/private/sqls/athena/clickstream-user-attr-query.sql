with base as (
  SELECT event_timestamp, user_id, user_properties, user_pseudo_id
  FROM
  (
    SELECT e.event_timestamp, e.user_id, e.user_properties, e.user_pseudo_id,
    sum(1) OVER (PARTITION BY e.user_pseudo_id ORDER BY e.event_timestamp DESC ROWS UNBOUNDED PRECEDING) AS row_number
    FROM {{database}}.{{eventTable}} e cross join unnest(e.user_properties) as t(u)
    WHERE partition_app = ? 
    and partition_year >= ?
    and partition_month >= ?
    and partition_day >= ?
    AND u.key IS NOT NULL
  )
  WHERE row_number = 1
)
select 
    user_pseudo_id
    ,user_id
    ,eu.key as custom_attr_key
    ,coalesce (nullif(eu.value.string_value,'')
    ,nullif(eu.value.int_value,'')
    ,nullif(eu.value.float_value,'')
    ,nullif(eu.value.double_value,'')) as custom_attr_value
from base cross join unnest(user_properties) as t(eu)