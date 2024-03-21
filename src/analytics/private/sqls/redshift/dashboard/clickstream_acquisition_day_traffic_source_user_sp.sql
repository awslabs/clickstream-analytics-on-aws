CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user_sp(day date) 
LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

  DELETE FROM {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user where event_date = day;

  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (event_date, platform, first_traffic_source, user_count)
  select 
    event_date,
    platform,
    first_traffic_source,
    count(distinct merged_user_id) as user_count
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  group by 1,2,3
  ;

EXCEPTION WHEN OTHERS THEN
    {{database_name}}.{{schema}}.sp_clickstream_log_non_atomic('clickstream_acquisition_day_traffic_source_user', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;
$$;