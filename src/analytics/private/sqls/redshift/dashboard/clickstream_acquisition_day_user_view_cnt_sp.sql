CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}}(day date, timezone varchar) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 
  current_date date;
  i integer = 0;
BEGIN
  current_date := day;

  WHILE i < ndays LOOP
    DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = day;
    
    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
      event_date, 
      platform,
      "Active users", 
      "New users",
      view_count
    )
    SELECT 
      day::date AS event_date,
      platform,
      merged_user_id as "Active users", 
      SUM(CASE WHEN event_name = '_first_open' THEN 1 ELSE 0 END) AS "New users",
      SUM(CASE WHEN event_name = '_screen_view' OR event_name = '_page_view' THEN 1 ELSE 0 END) AS view_count
    FROM 
      {{database_name}}.{{schema}}.{{baseView}}
    where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
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