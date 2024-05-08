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

    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
      event_date, 
      platform,
      app_version,
      merged_user_id, 
      crashed_user_id
    )
    select 
      current_date::date as event_date,
      platform,
      app_version,
      merged_user_id,
      case when event_name = '_app_exception' then merged_user_id else null end as crashed_user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = current_date
    group by 1, 2, 3, 4, 5
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