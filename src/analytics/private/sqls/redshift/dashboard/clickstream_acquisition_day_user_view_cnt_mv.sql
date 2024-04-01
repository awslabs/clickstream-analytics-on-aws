CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.{{viewName}}
BACKUP YES
SORTKEY(event_date, platform)
AUTO REFRESH NO
AS 
SELECT 
  event_date,
  platform,
  merged_user_id as "Active users", 
  SUM(CASE WHEN event_name = '_first_open' THEN 1 ELSE 0 END) AS "New users",
  SUM(CASE WHEN event_name = '_screen_view' OR event_name = '_page_view' THEN 1 ELSE 0 END) AS view_count
FROM 
  {{database_name}}.{{schema}}.{{baseView}}
GROUP BY 
  event_date, platform, merged_user_id    