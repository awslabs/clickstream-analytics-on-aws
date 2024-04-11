CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}}(day date, timezone varchar) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = day;

INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (event_date, platform, user_type, user_count)
select 
  day::date as event_date,
  platform,
  case when day = DATE(CONVERT_TIMEZONE(timezone, TIMESTAMP 'epoch' + (first_touch_time_msec/1000) * INTERVAL '1 second')) as first_date, then 'NEW' else 'RETURNING' end as user_type,
  count(distinct merged_user_id) as user_count
from {{database_name}}.{{schema}}.{{baseView}}
where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day 
group by 1,2,3
;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;