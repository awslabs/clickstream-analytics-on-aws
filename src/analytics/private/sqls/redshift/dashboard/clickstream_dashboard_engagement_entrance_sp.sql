CREATE OR REPLACE PROCEDURE {{dbName}}.{{schema}}.clickstream_dashboard_engagement_entrance_sp (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

    DELETE FROM {{dbName}}.{{schema}}.clickstream_dashboard_engagement_entrance where event_date = day;

    INSERT INTO {{dbName}}.{{schema}}.clickstream_dashboard_engagement_entrance (
        event_date,
        aggregation_type,
        aggregation_dim,
        entrance_cnt
    )
    select 
      event_date,
      'page_tile' as aggregation_type,
      page_view_page_title as aggregation_dim,
      count(1) as entrance_cnt
    from {{dbName}}.{{schema}}.{{baseView}}
    where 
      event_date = day
      and event_name = '_page_view'
      and page_view_entrances
      and page_view_page_title is not null
    group by 1, 2, 3
    ;

    INSERT INTO {{dbName}}.{{schema}}.clickstream_dashboard_engagement_entrance (
        event_date,
        aggregation_type,
        aggregation_dim,
        entrance_cnt
    )
    select 
      event_date,
      'page_url_path' as aggregation_type,
      page_view_page_url_path as aggregation_dim,
      count(1) as entrance_cnt
    from {{dbName}}.{{schema}}.{{baseView}}
    where 
      event_date = day
      and event_name = '_page_view'
      and page_view_entrances
      and page_view_page_url_path is not null
    group by 1, 2, 3
    ;

    INSERT INTO {{dbName}}.{{schema}}.clickstream_dashboard_engagement_entrance (
        event_date,
        aggregation_type,
        aggregation_dim,
        entrance_cnt
    )
    select 
      event_date,
      'screen_name' as aggregation_type,
      screen_view_screen_name as aggregation_dim,
      count(1) as entrance_cnt
    from {{dbName}}.{{schema}}.{{baseView}}
    where 
      event_date = day
      and event_name = '_screen_view'
      and page_view_entrances
      and screen_view_screen_name is not null
    group by 1, 2, 3
    ;

    INSERT INTO {{dbName}}.{{schema}}.clickstream_dashboard_engagement_entrance (
        event_date,
        aggregation_type,
        aggregation_dim,
        entrance_cnt
    )
    select 
      event_date,
      'screen_class' as aggregation_type,
      screen_view_screen_id as aggregation_dim,
      count(1) as entrance_cnt
    from {{dbName}}.{{schema}}.{{baseView}}
    where 
      event_date = day
      and event_name = '_screen_view'
      and page_view_entrances
      and screen_view_screen_id is not null
    group by 1, 2, 3
    ;

EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
