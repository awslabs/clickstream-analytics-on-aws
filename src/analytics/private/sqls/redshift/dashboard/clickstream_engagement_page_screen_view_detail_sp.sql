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
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_seconds,
        event_count
    )
    select 
      current_date::date as event_date,
      platform,
      'Page Title' as aggregation_type,
      page_view_page_title as aggregation_dim,
      merged_user_id,
      sum(user_engagement_time_msec)::real/1000 as user_engagement_time_seconds,
      count(distinct event_id) as event_count
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
      DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = current_date
    group by 1,2,3,4,5
    ;

    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_seconds,
        event_count
    )
    select 
      current_date::date as event_date,
      platform,
      'Page URL Path' as aggregation_type,
      page_view_page_url_path as aggregation_dim,
      merged_user_id,
      sum(user_engagement_time_msec)::real/1000 as user_engagement_time_seconds,
      count(distinct event_id) as event_count
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
      DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = current_date
    group by 1,2,3,4,5
    ;

    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_seconds,
        event_count
    )
    select 
      current_date::date as event_date,
      platform,
      'Screen Name' as aggregation_type,
      screen_view_screen_name as aggregation_dim,
      merged_user_id,
      sum(user_engagement_time_msec)::real/1000 as user_engagement_time_seconds,
      count(distinct event_id) as event_count
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
      DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = current_date
    group by 1,2,3,4,5
    ;

    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_seconds,
        event_count
    )
    select 
      current_date::date as event_date,
      platform,
      'Screen Class' as aggregation_type,
      screen_view_screen_id as aggregation_dim,
      merged_user_id,
      sum(user_engagement_time_msec)::real/1000 as user_engagement_time_seconds,
      count(distinct event_id) as event_count
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
      DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = current_date
    group by 1,2,3,4,5
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
