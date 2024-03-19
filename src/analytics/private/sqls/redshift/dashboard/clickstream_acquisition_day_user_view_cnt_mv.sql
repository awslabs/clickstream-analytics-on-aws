CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.clickstream_acquisition_day_user_view_cnt_mv
BACKUP YES
AUTO REFRESH NO
SORTKEY(event_date, platform)
AS 
SELECT 
  event_date,
  platform,
  merged_user_id, 
  SUM(CASE WHEN event_name = '_first_open' THEN 1 ELSE 0 END) AS new_user_count,
  SUM(CASE WHEN event_name = '_screen_view' OR event_name = '_page_view' THEN 1 ELSE 0 END) AS view_count
FROM 
  {{database_name}}.{{schema}}.{{baseView}}
GROUP BY 
  event_date, platform, merged_user_id    