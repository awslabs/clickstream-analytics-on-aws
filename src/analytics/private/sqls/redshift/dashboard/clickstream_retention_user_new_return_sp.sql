CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}}(day date, timezone varchar, ndays integer) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 
  current_date date;
  i integer = 0;
BEGIN
  current_date := day;
  WHILE i < ndays LOOP

    DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = current_date;

    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (event_date, platform, user_type, user_count)
    select 
      current_date::date as event_date,
      platform,
      case when current_date = DATE(CONVERT_TIMEZONE(timezone, TIMESTAMP 'epoch' + (first_touch_time_msec/1000) * INTERVAL '1 second')) then 'NEW' else 'RETURNING' end as user_type,
      count(distinct merged_user_id) as user_count
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone 
    group by 1,2,3
    ;

    current_date := current_date - 1;
    i := i + 1;
  END LOOP;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;