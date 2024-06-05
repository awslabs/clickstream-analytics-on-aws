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
        platform,
        user_id,
        event_name,
        event_value,
        event_count
    )
    select 
      current_date::date as event_date,
      platform,
      merged_user_id as user_id,
      event_name,
      sum(event_value) as event_value,
      count(distinct event_id) as event_count
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
    group by 1,2,3,4
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
