CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.{{viewName}}
BACKUP YES
SORTKEY(event_date, platform)
AUTO REFRESH NO
AS   
SELECT 
   DATE_TRUNC('hour', CONVERT_TIMEZONE('{{{timezone}}}', event_timestamp)) as event_date,
   platform,
   merged_user_id as "Active User",
   new_user_indicator as "New User"
FROM {{database_name}}.{{schema}}.{{baseView}}
GROUP BY 1,2,3,4
;