CREATE OR REPLACE VIEW {{schema}}.clickstream_daily_active_user_view AS 
  SELECT 
    event_date, 
    DATE(DATE_TRUNC('day', TIMESTAMP 'epoch' + event_timestamp/1000 * INTERVAL '1 second')) AS event_create_day, 
    user_pseudo_id, 
    geo.country::varchar AS country, 
    device.mobile_brand_name::varchar AS mobile_brand, 
    device.language as language, 
    case when max(case when event_name = '_first_open' then 1 else 0 end) = 1 then 'new_user' else 'existing_user' end as user_type
  FROM {{schema}}.{{table_ods_events}}
  GROUP by event_date, event_create_day, user_pseudo_id, country, mobile_brand, language