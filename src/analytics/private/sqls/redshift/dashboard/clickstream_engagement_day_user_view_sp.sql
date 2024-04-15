CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}} (day date, timezone varchar) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

    DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = day;

    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
        event_date,
        platform,
        event_count,
        view_count
    )
    select 
    day::date as event_date,
    platform,
    count(distinct event_id) as event_count,
    count(distinct view_event_indicator) as view_count
    from {{database_name}}.{{schema}}.{{baseView}}
    where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
    group by 1,2
    ;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
