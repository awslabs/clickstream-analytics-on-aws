CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.{{viewName}}
BACKUP YES
SORTKEY(first_date)
AUTO REFRESH NO
AS
select
  e.user_pseudo_id,
  e.platform,
  DATE(CONVERT_TIMEZONE('{{{timezone}}}', TIMESTAMP 'epoch' + u.first_touch_time_msec/1000 * INTERVAL '1 second')) as first_date,
  DATE_DIFF('day', DATE(CONVERT_TIMEZONE('{{{timezone}}}', TIMESTAMP 'epoch' + u.first_touch_time_msec/1000 * INTERVAL '1 second')), DATE(CONVERT_TIMEZONE('{{{timezone}}}', e.event_timestamp))) as day_diff
from {{database_name}}.{{schema}}.clickstream_event_base_view e
join {{database_name}}.{{schema}}.user_v2 u using(user_pseudo_id)
where e.event_timestamp >= TIMESTAMP 'epoch' + u.first_touch_time_msec/1000 * INTERVAL '1 second'
and u.first_touch_time_msec is not null
and day_diff <= 42 
group by 1,2,3,4
;