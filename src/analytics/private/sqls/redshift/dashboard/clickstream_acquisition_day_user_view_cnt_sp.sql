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
      active_users, 
      new_users,
      view_count
    )
    SELECT 
      current_date::date AS event_date,
      platform,
      merged_user_id as active_users, 
      count(distinct CASE WHEN event_name = '_first_open' THEN user_pseudo_id ELSE null END) AS new_users,
      count(distinct CASE WHEN event_name = '_screen_view' OR event_name = '_page_view' THEN event_id ELSE null END) AS view_count
    FROM 
      {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
    GROUP BY 
      1,2,3
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