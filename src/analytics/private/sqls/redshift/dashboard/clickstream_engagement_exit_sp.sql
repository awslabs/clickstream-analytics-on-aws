CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}} (day date, timezone varchar) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

    DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = day;

    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        exit_count
    )
    WITH tmp1 AS (
      SELECT 
        session_id,
        platform,
        screen_view_screen_name,
        ROW_NUMBER() OVER(PARTITION BY session_id ORDER BY event_timestamp DESC) AS rk
      FROM 
        {{database_name}}.{{schema}}.{{baseView}}
      WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
        and event_name = '_screen_view'
        and screen_view_screen_name is not null
    ), 
    tmp2 AS (
      SELECT 
        *
      FROM 
        tmp1
      WHERE 
        rk = 1
    )
    SELECT 
      day:: date as event_date,
      platform,
      'Screen Name' as aggregation_type,
      screen_view_screen_name as aggregation_dim,
      COUNT(1) AS exit_count
    FROM 
      tmp2 
    GROUP BY 
      1,2,3,4;


    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        exit_count
    )
    WITH tmp1 AS (
      SELECT 
        session_id,
        platform,
        screen_view_screen_id,
        ROW_NUMBER() OVER(PARTITION BY session_id ORDER BY event_timestamp DESC) AS rk
      FROM 
        {{database_name}}.{{schema}}.{{baseView}}
      WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
        and event_name = '_screen_view'
        and screen_view_screen_id is not null
    ), 
    tmp2 AS (
      SELECT 
        *
      FROM 
        tmp1
      WHERE 
        rk = 1
    )
    SELECT 
      day:: date as event_date,
      platform,
      'Screen Class' as aggregation_type,
      screen_view_screen_id as aggregation_dim,
      COUNT(1) AS exit_count
    FROM 
      tmp2 
    GROUP BY 
      1,2,3,4;


    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        exit_count
    )
    WITH tmp1 AS (
      SELECT 
        session_id,
        platform,
        page_view_page_title,
        ROW_NUMBER() OVER(PARTITION BY session_id ORDER BY event_timestamp DESC) AS rk
      FROM 
        {{database_name}}.{{schema}}.{{baseView}}
      WHERE
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day 
        and event_name = '_page_view'
        and page_view_page_title is not null
    ), 
    tmp2 AS (
      SELECT 
        *
      FROM 
        tmp1
      WHERE 
        rk = 1
    )
    SELECT 
      day:: date as event_date,
      platform,
      'Page Title' as aggregation_type,
      page_view_page_title as aggregation_dim,
      COUNT(1) AS exit_count
    FROM 
      tmp2 
    GROUP BY 
      1,2,3,4;


    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        exit_count
    )
    WITH tmp1 AS (
      SELECT 
        session_id,
        platform,
        page_view_page_url_path,
        ROW_NUMBER() OVER(PARTITION BY session_id ORDER BY event_timestamp DESC) AS rk
      FROM 
        {{database_name}}.{{schema}}.{{baseView}}
      WHERE 
        DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
        and event_name = '_page_view'
        and page_view_page_url_path is not null
    ), 
    tmp2 AS (
      SELECT 
        *
      FROM 
        tmp1
      WHERE 
        rk = 1
    )
    SELECT 
      day:: date as event_date,
      platform,
      'Page URL Path' as aggregation_type,
      page_view_page_url_path as aggregation_dim,
      COUNT(1) AS exit_count
    FROM 
      tmp2 
    GROUP BY 
      1,2,3,4;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
