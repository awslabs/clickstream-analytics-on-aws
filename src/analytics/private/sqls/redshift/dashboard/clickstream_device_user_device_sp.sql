CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}} (day date, timezone varchar) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = day;

INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date,
    merged_user_id,
    platform,
    app_version,
    "operating_system / version",
    device_ua_browser,
    device_screen_resolution, 
    event_count
  )
select 
  day::date as event_date,
  merged_user_id,
  platform,
  app_version,
  device_operating_system || device_ua_os || ' / ' || device_operating_system_version || device_ua_os_version as "operating_system / version",
  device_ua_browser,
  device_screen_height || ' x ' || device_screen_width  as device_screen_resolution
  count(event_id) as event_count
from {{database_name}}.{{schema}}.{{baseView}}
where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
group by 1,2,3,4,5,6,7
;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$;