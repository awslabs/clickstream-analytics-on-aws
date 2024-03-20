CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view_sp (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

    DELETE FROM {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view where event_date = day;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        view_cnt
    )
    select 
      event_date,
      platform,
      'page_title' as aggregation_type,
      page_view_page_title as aggregation_dim,
      count(distinct event_id) as view_cnt
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_page_view'
    group by 1, 2, 3, 4
    ;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        view_cnt
    )
    select 
      event_date,
      platform,
      'page_url_path' as aggregation_type,
      page_view_page_url_path as aggregation_dim,
      count(distinct event_id) as view_cnt
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_page_view'
    group by 1, 2, 3, 4
    ;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        view_cnt
    )
    select 
      event_date,
      platform,
      'screen_name' as aggregation_type,
      screen_view_screen_name as aggregation_dim,
      count(distinct event_id) as view_cnt
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_screen_view'
    group by 1, 2, 3, 4
    ;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        view_cnt
    )
    select 
      event_date,
      platform,
      'screen_class' as aggregation_type,
      screen_view_screen_id as aggregation_dim,
      count(distinct event_id) as view_cnt
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_screen_view'
    group by 1, 2, 3, 4
    ;

EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
