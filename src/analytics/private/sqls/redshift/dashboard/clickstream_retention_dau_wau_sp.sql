CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_retention_dau_wau_sp(day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{database_name}}.{{schema}}.clickstream_retention_dau_wau where event_date = day;

INSERT INTO {{database_name}}.{{schema}}.clickstream_retention_dau_wau (
  event_date, 
  platform, 
  merged_user_id
)
select 
  event_date,
  platform,
  merged_user_id
from {{database_name}}.{{schema}}.{{baseView}}
where event_date = day
group by 1, 2, 3
;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log_non_atomic('clickstream_retention_dau_wau', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;