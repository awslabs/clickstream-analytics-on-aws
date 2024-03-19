CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_engagement_kpi_sp (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{database_name}}.{{schema}}.clickstream_engagement_kpi where event_date = day;

INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_kpi (
    event_date, 
    avg_session_per_user, 
    avg_engagement_time_per_session,
    avg_engagement_time_per_user
)
WITH tmp1 AS (
    SELECT
        day:: date as event_date,
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
        event_date, session_id, merged_user_id
)
select 
  event_date,
  sum(session_indicator)/count(distinct merged_user_id) as avg_session_per_user,
  sum(user_engagement_time_msec)::double precision/sum(session_indicator)/1000/60 as avg_engagement_time_per_session,
  sum(user_engagement_time_msec)::double precision/count(distinct merged_user_id)/1000/60 avg_engagement_time_per_user
from tmp1
group by 1
;

EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
