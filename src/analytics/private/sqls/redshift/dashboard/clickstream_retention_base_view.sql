CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.{{viewName}}
BACKUP YES
SORTKEY(first_date)
AUTO REFRESH NO
AS
select
  user_pseudo_id,
  DATE(CONVERT_TIMEZONE('{{{timezone}}}', TIMESTAMP 'epoch' + first_touch_time_msec/1000 * INTERVAL '1 second')) as first_date,
  DATE_DIFF('day', DATE(CONVERT_TIMEZONE('{{{timezone}}}', TIMESTAMP 'epoch' + first_touch_time_msec/1000 * INTERVAL '1 second')), DATE(CONVERT_TIMEZONE('{{{timezone}}}', event_timestamp))) as day_diff
from {{database_name}}.{{schema}}.{{baseView}}
where event_timestamp >= TIMESTAMP 'epoch' + first_touch_time_msec/1000 * INTERVAL '1 second'
and day_diff <= 42 
group by 1,2,3
;