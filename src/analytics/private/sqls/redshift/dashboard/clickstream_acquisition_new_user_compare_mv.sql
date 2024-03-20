CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.clickstream_acquisition_new_user_compare_mv
BACKUP YES
SORTKEY(event_date_hour, platform)
AUTO REFRESH NO
AS 
with tmp as (
  select 
    event_date_hour,
    platform,
    SUM(CASE WHEN event_name = '_first_open' THEN 1 ELSE 0 END) AS new_user_count
  from {{database_name}}.{{schema}}.{{baseView}} 
  where event_timestamp >= DATE_TRUNC('hour', CONVERT_TIMEZONE('{{timezone}}', GETDATE() - INTERVAL '3 days'))
  group by 1,2
)
select 
  l.*,
  r.new_user_count as previous_new_user_count
from tmp l 
left join tmp r 
on DATEDIFF(second, r.event_date_hour, l.event_date_hour) = 24 * 3600 and l.platform = r.platform
;