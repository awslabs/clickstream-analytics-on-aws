CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_engagement_exit_sp (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

    DELETE FROM {{database_name}}.{{schema}}.clickstream_engagement_exit where event_date = day;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_exit (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        exit_cnt
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
        event_name = '_screen_view'
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
      'screen_name' as aggregation_type,
      screen_view_screen_name as aggregation_dim,
      COUNT(1) AS exit_cnt
    FROM 
      tmp2 
    GROUP BY 
      1,2,3,4;


    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_exit (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        exit_cnt
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
        event_name = '_screen_view'
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
      'screen_id' as aggregation_type,
      screen_view_screen_id as aggregation_dim,
      COUNT(1) AS exit_cnt
    FROM 
      tmp2 
    GROUP BY 
      1,2,3,4;


    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_exit (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        exit_cnt
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
        event_name = '_page_view'
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
      'page_title' as aggregation_type,
      page_view_page_title as aggregation_dim,
      COUNT(1) AS exit_cnt
    FROM 
      tmp2 
    GROUP BY 
      1,2,3,4;


    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_exit (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        exit_cnt
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
        event_name = '_page_view'
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
      'page_url_path' as aggregation_type,
      page_view_page_url_path as aggregation_dim,
      COUNT(1) AS exit_cnt
    FROM 
      tmp2 
    GROUP BY 
      1,2,3,4;

EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
