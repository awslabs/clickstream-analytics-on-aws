CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.clickstream_acquisition_active_user_compare_mv
BACKUP YES
SORTKEY(event_date_hour)
AUTO REFRESH NO
AS
with tmp as (
  select 
    event_date_hour,
    platform,
    COUNT(distinct merged_user_id) as active_user_count
  from {{database_name}}.{{schema}}.{{baseView}} 
  where event_timestamp >= DATE_TRUNC('hour', CONVERT_TIMEZONE('{{timezone}}', GETDATE() - INTERVAL '3 days'))
  group by 1,2
)
select 
  l.*,
  r.active_user_count as previous_active_user_count
from tmp l 
left join tmp r 
on DATEDIFF(second, r.event_date_hour, l.event_date_hour) = 24 * 3600 and l.platform = r.platform
;