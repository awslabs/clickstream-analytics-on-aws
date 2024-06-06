CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}} (day date, timezone varchar, ndays integer) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 
  current_date date;
  i integer = 0;
BEGIN
  current_date := day;
  WHILE i < ndays LOOP
    DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = current_date;

    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
      event_date,
      user_id,
      platform,
      device,
      app_version,
      operating_system,
      operating_system_version,
      device_ua_browser,
      device_screen_resolution, 
      device_ua_device,
      device_ua_device_category,
      event_count
    )
    select 
      current_date::date as event_date,
      merged_user_id as user_id,
      platform,
      coalesce(device_mobile_model_name, device_ua_device) as device,
      app_version,
      coalesce(device_operating_system, device_ua_os, 'null' ) as operating_system,
      coalesce(device_operating_system_version, device_ua_os_version, 'null') as operating_system_version,
      device_ua_browser,
      coalesce(device_screen_width::varchar, '') || ' x ' || coalesce(device_screen_height::varchar, '')   as device_screen_resolution,
      device_ua_device,
      device_ua_device_category,
      count(distinct event_id) as event_count
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
    group by 1,2,3,4,5,6,7,8,9,10,11
    ;

    current_date := current_date - 1;
    i := i + 1;
  END LOOP;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$;