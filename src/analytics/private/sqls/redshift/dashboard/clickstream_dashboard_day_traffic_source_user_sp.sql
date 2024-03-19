CREATE OR REPLACE PROCEDURE {{dbName}}.{{schema}}.clickstream_dashboard_day_traffic_source_user_sp(day date) 
LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

  DELETE FROM {{dbName}}.{{schema}}.clickstream_dashboard_day_traffic_source_user where event_date = day;

  INSERT INTO {{dbName}}.{{schema}}.clickstream_dashboard_day_traffic_source_user (event_date, platform, first_traffic_source, user_count)
  select 
    event_date,
    platform,
    first_traffic_source,
    count(distinct merged_user_id) as user_count
  from {{dbName}}.{{schema}}.{{baseView}}
  where event_date = day
  group by 1,2,3
  ;

EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;
$$;