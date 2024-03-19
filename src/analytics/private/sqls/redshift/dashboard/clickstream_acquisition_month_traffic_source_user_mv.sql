CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.clickstream_acquisition_month_traffic_source_user_mv (
BACKUP YES
AUTO REFRESH NO
SORTKEY (event_date) 
AS 
select 
  event_date,
  platform,
  first_traffic_source,
  merged_user_id
from {{database_name}}.{{schema}}.{{baseView}}
group by 1,2,3,4