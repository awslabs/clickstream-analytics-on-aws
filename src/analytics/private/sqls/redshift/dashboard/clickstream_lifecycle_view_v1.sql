CREATE MATERIALIZED VIEW {{schema}}.{{viewName}}
BACKUP YES
AUTO REFRESH NO
AS
select 
  user_pseudo_id, 
  DATE_TRUNC('day', dateadd(ms,event_timestamp, '1970-01-01')) as time_period,
  DATE_TRUNC('week', dateadd(ms,event_timestamp, '1970-01-01')) as time_period_week
from {{schema}}.event
where event_name = '_session_start' 
group by 1,2,3
;