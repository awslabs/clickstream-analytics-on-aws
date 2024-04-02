CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}} (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = day;

INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform,
    avg_session_per_user, 
    avg_engagement_time_per_session_minutes,
    avg_engagement_time_per_user_minutes
)
WITH tmp1 AS (
    SELECT
        day:: date as event_date,
        platform,
        session_id,
        merged_user_id,
        SUM(user_engagement_time_msec) AS user_engagement_time_msec,
        CASE WHEN
           SUM(CASE WHEN event_name = '_page_view' OR event_name = '_screen_view' THEN 1 ELSE 0 END) > 1 
         OR MAX(session_duration) > 10000  THEN 1 ELSE 0 
        END AS session_indicator
    FROM 
        {{database_name}}.{{schema}}.{{baseView}}
    WHERE
        event_date = day
    GROUP BY 
        1,2,3,4
)
select 
  event_date,
  platform,
  sum(session_indicator)::double precision/count(distinct merged_user_id) as avg_session_per_user,
  sum(user_engagement_time_msec)::double precision/sum(session_indicator)/1000/60 as avg_engagement_time_per_session_minutes,
  sum(user_engagement_time_msec)::double precision/count(distinct merged_user_id)/1000/60 avg_engagement_time_per_user_minutes
from tmp1
group by 1,2
;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
