CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_engagement_day_user_view_sp (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

    DELETE FROM {{database_name}}.{{schema}}.clickstream_engagement_day_user_view where event_date = day;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_day_user_view (
        event_date,
        event_cnt,
        view_cnt
    )
    select 
    event_date,
    count(distinct event_id) as event_cnt,
    count(distinct view_event_indicator) as view_cnt
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_date = day
    group by 1

EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
