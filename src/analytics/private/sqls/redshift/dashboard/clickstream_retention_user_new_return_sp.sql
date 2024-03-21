CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_retention_user_new_return_sp(day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{database_name}}.{{schema}}.clickstream_retention_user_new_return where event_date = day;

INSERT INTO {{database_name}}.{{schema}}.clickstream_retention_user_new_return (event_date, platform, user_type, user_cnt)
select 
  event_date,
  platform,
  case when day = first_visit_date then 'NEW' else 'RETURN' end as user_type,
  count(distinct merged_user_id) as user_cnt
from {{database_name}}.{{schema}}.{{baseView}}
where event_date = day
group by 1,2,3
;

EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;