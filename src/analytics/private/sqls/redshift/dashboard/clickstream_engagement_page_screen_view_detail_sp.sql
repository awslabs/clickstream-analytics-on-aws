CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view_detail_sp (day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

    DELETE FROM {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view_detail where event_date = day;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view_detail (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_msec,
        event_id
    )
    select 
      event_date,
      platform,
      'page_title' as aggregation_type,
      page_view_page_title as aggregation_dim,
      merged_user_id,
      user_engagement_time_msec,
      event_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_page_view'
    ;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view_detail (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_msec,
        event_id
    )
    select 
      event_date,
      platform,
      'page_url_path' as aggregation_type,
      page_view_page_url_path as aggregation_dim,
      merged_user_id,
      user_engagement_time_msec,
      event_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_page_view'
    ;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view_detail (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_msec,
        event_id
    )
    select 
      event_date,
      platform,
      'screen_name' as aggregation_type,
      screen_view_screen_name as aggregation_dim,
      merged_user_id,
      user_engagement_time_msec,
      event_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_screen_view'
    ;

    INSERT INTO {{database_name}}.{{schema}}.clickstream_engagement_page_screen_view_detail (
        event_date,
        platform,
        aggregation_type,
        aggregation_dim,
        user_id,
        user_engagement_time_msec,
        event_id
    )
    select 
      event_date,
      platform,
      'screen_class' as aggregation_type,
      screen_view_screen_id as aggregation_dim,
      merged_user_id,
      user_engagement_time_msec,
      event_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where 
        event_date = day
    and event_name = '_screen_view'
    ;

EXCEPTION WHEN OTHERS THEN
    {{database_name}}.{{schema}}.sp_clickstream_log_non_atomic('clickstream_engagement_page_screen_view_detail', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
