CREATE OR REPLACE PROCEDURE {{dbName}}.{{schema}}.clickstream_dashboard_coutry_new_user_sp (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{dbName}}.{{schema}}.{{traffic_table_name}} where event_date = day;

INSERT INTO {{dbName}}.{{schema}}.{{traffic_table_name}} (event_date, geo_country, user_count)
select 
  event_date,
  geo_country,
  count(distinct new_user_indicator) as user_count
from {{dbName}}.{{schema}}.{{baseView}}
where event_date = day
group by 1,2
;

EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$;
