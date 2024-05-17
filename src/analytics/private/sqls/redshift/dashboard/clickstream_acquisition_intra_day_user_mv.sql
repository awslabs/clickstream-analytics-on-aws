CREATE MATERIALIZED VIEW {{database_name}}.{{schema}}.{{viewName}}
BACKUP YES
SORTKEY(event_date, platform)
AUTO REFRESH NO
AS   
SELECT 
   DATE_TRUNC('hour', CONVERT_TIMEZONE('{{{timezone}}}', e.event_timestamp)) as event_date,
   e.platform,
   COALESCE(u.user_id, e.user_pseudo_id) as active_users,
   CASE WHEN event_name = '_first_open' THEN COALESCE(u.user_id, e.user_pseudo_id) ELSE NULL END as new_users
FROM {{database_name}}.{{schema}}.clickstream_event_base_view as e
join {{database_name}}.{{schema}}.user_v2 as u using(user_pseudo_id)
GROUP BY 1,2,3,4
;