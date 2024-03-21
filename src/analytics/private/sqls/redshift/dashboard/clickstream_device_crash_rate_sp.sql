CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_device_crash_rate_sp(day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{database_name}}.{{schema}}.clickstream_device_crash_rate where event_date = day;

INSERT INTO {{database_name}}.{{schema}}.clickstream_device_crash_rate (
  event_date, 
  platform,
  merged_user_id, 
  crashed_user_id
)
select 
  event_date,
  platform,
  merged_user_id,
  case when event_name = '_app_exeption' then merged_user_id else null end as crashed_user_id
from {{database_name}}.{{schema}}.{{baseView}}
where event_date = day
group by 1, 2, 3, 4
;

EXCEPTION WHEN OTHERS THEN
    {{database_name}}.{{schema}}.sp_clickstream_log_non_atomic('clickstream_device_crash_rate', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;