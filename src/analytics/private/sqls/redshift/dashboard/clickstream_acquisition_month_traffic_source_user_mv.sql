CREATE MATERIALIZED VIEW {{dbName}}.{{schema}}.clickstream_acquisition_month_traffic_source_user_mv (
BACKUP YES
AUTO REFRESH NO
SORTKEY (event_date) 
AS 
select 
  event_date,
  platform,
  first_traffic_source,
  merged_user_id
from {{dbName}}.{{schema}}.{{baseView}}
group by 1,2,3,4