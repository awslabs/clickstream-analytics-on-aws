CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}} (day date, timezone varchar, ndays integer) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 
  current_date date;
  i integer = 0;
BEGIN
  current_date := day;
  WHILE i < ndays LOOP
    DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = current_date;

    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
        event_date, 
        platform,
        avg_engaged_session_per_user, 
        avg_engagement_time_per_session_seconds,
        avg_engagement_time_per_user_seconds
    )
    WITH tmp1 AS (
        SELECT
            current_date:: date as event_date,
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
            event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
        GROUP BY 
            1,2,3,4
    )
    select 
      event_date,
      platform,
      sum(session_indicator)::real/count(distinct merged_user_id) as avg_engaged_session_per_user,
      sum(case when session_indicator = 1 then user_engagement_time_msec else 0 end)::real/case when sum(session_indicator) = 0 then 1 else sum(session_indicator) end /1000 as avg_engagement_time_per_session_seconds,
      sum(case when session_indicator = 1 then user_engagement_time_msec else 0 end)::real/count(distinct merged_user_id)/1000 avg_engagement_time_per_user_seconds
    from tmp1
    group by 1,2
    ;
    
    current_date := current_date - 1;
    i := i + 1;
  END LOOP;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
