CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.{{viewName}}
BACKUP YES
SORTKEY(first_date)
AUTO REFRESH NO
AS
select
  user_pseudo_id,
  first_visit_date as first_date,
  DATE_DIFF('day', first_visit_date, DATE(CONVERT_TIMEZONE('Asia/Shanghai', event_timestamp))) as day_diff
from {{database_name}}.{{schema}}.{{baseView}}
where event_timestamp >= first_visit_date
and DATE_DIFF('day', first_visit_date, DATE(CONVERT_TIMEZONE('Asia/Shanghai', event_timestamp)))<= 42 
group by 1,2,3
;