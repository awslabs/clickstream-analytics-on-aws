CREATE OR REPLACE PROCEDURE {{dbName}}.{{schema}}.clickstream_engagement_page_screen_view_detail_sp (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

    DELETE FROM {{dbName}}.{{schema}}.clickstream_engagement_page_screen_view_detail where event_date = day;

    INSERT INTO {{dbName}}.{{schema}}.clickstream_engagement_page_screen_view_detail (
        event_date,
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_msec,
        event_id
    )
    select 
      event_date,
      'page_title' as aggregation_type,
      page_view_page_title as aggregation_dim,
      event_id,
      user_engagement_time_msec,
      merged_user_id
    from {{dbName}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_page_view'
    ;

    INSERT INTO {{dbName}}.{{schema}}.clickstream_engagement_page_screen_view_detail (
        event_date,
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_msec,
        event_id
    )
    select 
      event_date,
      'page_url_path' as aggregation_type,
      page_view_page_url_path as aggregation_dim,
      event_id,
      user_engagement_time_msec,
      merged_user_id
    from {{dbName}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_page_view'
    ;

    INSERT INTO {{dbName}}.{{schema}}.clickstream_engagement_page_screen_view_detail (
        event_date,
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_msec,
        event_id
    )
    select 
      event_date,
      'screen_name' as aggregation_type,
      screen_view_screen_name as aggregation_dim,
      event_id,
      user_engagement_time_msec,
      merged_user_id
    from {{dbName}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_screen_view'
    ;

    INSERT INTO {{dbName}}.{{schema}}.clickstream_engagement_page_screen_view_detail (
        event_date,
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_msec,
        event_id
    )
    select 
      event_date,
      'screen_class' as aggregation_type,
      screen_view_screen_id as aggregation_dim,
      event_id,
      user_engagement_time_msec,
      merged_user_id
    from {{dbName}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_screen_view'
    ;

EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
