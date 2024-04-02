CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}} (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

    DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = day;

    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
        event_date,
        platform,
        event_cnt,
        view_cnt
    )
    select 
    event_date,
    platform,
    count(distinct event_id) as event_cnt,
    count(distinct view_event_indicator) as view_cnt
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_date = day
    group by 1,2
    ;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
