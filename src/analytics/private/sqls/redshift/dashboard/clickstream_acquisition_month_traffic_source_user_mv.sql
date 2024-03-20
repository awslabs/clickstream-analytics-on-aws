CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.clickstream_acquisition_month_traffic_source_user_mv
BACKUP YES
SORTKEY (event_date, platform)
AUTO REFRESH NO
AS 
select 
  event_date,
  platform,
  first_traffic_source,
  merged_user_id
from {{database_name}}.{{schema}}.{{baseView}}
group by 1,2,3,4