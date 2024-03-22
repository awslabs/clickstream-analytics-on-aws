CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_engagement_entrance_sp (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

    DELETE FROM {{database_name}}.{{schema}}.clickstream_engagement_entrance where event_date = day;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_entrance (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        entrance_cnt
    )
    select 
      event_date,
      platform,
      'page_tile' as aggregation_type,
      page_view_page_title as aggregation_dim,
      count(1) as entrance_cnt
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
      event_date = day
      and event_name = '_page_view'
      and page_view_entrances = 'true'
      and page_view_page_title is not null
    group by 1, 2, 3, 4
    ;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_entrance (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        entrance_cnt
    )
    select 
      event_date,
      platform,
      'page_url_path' as aggregation_type,
      page_view_page_url_path as aggregation_dim,
      count(1) as entrance_cnt
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
      event_date = day
      and event_name = '_page_view'
      and page_view_entrances = 'true'
      and page_view_page_url_path is not null
    group by 1, 2, 3, 4
    ;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_entrance (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        entrance_cnt
    )
    select 
      event_date,
      platform,
      'screen_name' as aggregation_type,
      screen_view_screen_name as aggregation_dim,
      count(1) as entrance_cnt
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
      event_date = day
      and event_name = '_screen_view'
      and page_view_entrances = 'true'
      and screen_view_screen_name is not null
    group by 1, 2, 3, 4
    ;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_entrance (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        entrance_cnt
    )
    select 
      event_date,
      platform,
      'screen_class' as aggregation_type,
      screen_view_screen_id as aggregation_dim,
      count(1) as entrance_cnt
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
      event_date = day
      and event_name = '_screen_view'
      and page_view_entrances = 'true'
      and screen_view_screen_id is not null
    group by 1, 2, 3, 4
    ;

EXCEPTION WHEN OTHERS THEN
    {{database_name}}.{{schema}}.sp_clickstream_log_non_atomic('clickstream_engagement_entrance', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
