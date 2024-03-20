CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_acquisition_country_new_user_sp (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{database_name}}.{{schema}}.clickstream_acquisition_country_new_user where event_date = day;

INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_country_new_user (event_date, geo_country, user_count)
select 
  event_date,
  platform,
  geo_country,
  count(distinct new_user_indicator) as user_count
from {{database_name}}.{{schema}}.{{baseView}}
where event_date = day
group by 1,2,3
;

EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$;
