CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}}(day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = day;

INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
  event_date, 
  platform,
  app_version,
  merged_user_id, 
  crashed_user_id
)
select 
  event_date,
  platform,
  app_version,
  merged_user_id,
  case when event_name = '_app_exeption' then merged_user_id else null end as crashed_user_id
from {{database_name}}.{{schema}}.{{baseView}}
where event_date = day
group by 1, 2, 3, 4, 5
;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log_non_atomic('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;