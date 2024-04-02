CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}} (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = day;

INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (event_date, platform, geo_country, geo_city, user_count)
select 
  event_date,
  platform,
  geo_country,
  geo_city,
  count(distinct new_user_indicator) as user_count
from {{database_name}}.{{schema}}.{{baseView}}
where event_date = day
group by 1,2,3,4
;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$;
