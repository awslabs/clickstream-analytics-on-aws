CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.{{viewName}}
BACKUP YES
AUTO REFRESH NO
AS
select 
  user_pseudo_id, 
  DATE_TRUNC('week', CONVERT_TIMEZONE('{{{timezone}}}', event_timestamp)) as time_period_week
from {{database_name}}.{{schema}}.event_v2
where event_name = '_session_start' 
group by 1,2
;