CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}} (p_start_time timestamp, p_end_time timestamp) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 
  start_time timestamp;
  end_time timestamp;
BEGIN

  IF p_start_time IS NOT NULL and p_end_time IS NOT NULL THEN
    SELECT 
      p_start_time as start_time,
      p_end_time as end_time INTO rec
    ;
    call {{database_name}}.{{schema}}.sp_clickstream_log('clickstream_event_base_view', 'info', 'refresh with custom time range:' || start_time || ' - ' || end_time);
  ELSE
    SELECT 
      COALESCE(max(create_time), CURRENT_TIMESTAMP - INTERVAL '1 days') as start_time,
      CURRENT_TIMESTAMP + INTERVAL '1 days' as end_time INTO rec
    FROM {{database_name}}.{{schema}}.clickstream_event_base_view
    WHERE event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days' --reduce scan range

    call {{database_name}}.{{schema}}.sp_clickstream_log('clickstream_event_base_view', 'info', 'refresh time range:' || start_time || ' - ' || end_time);
  END IF
  ;

  create temp table clickstream_event_base_view_stage (like {{database_name}}.{{schema}}.clickstream_event_base_view); 

  insert into clickstream_event_base_view_stage 
  select 
    e.event_timestamp,
    e.event_id,
    e.event_time_msec,
    e.event_name,
    e.user_pseudo_id,
    e.user_id,
    e.session_id,
    event_value,
    event_value_currency,
    event_bundle_sequence_id,
    ingest_time_msec,
    create_time,
    device_mobile_brand_name,
    device_mobile_model_name,
    device_manufacturer,
    device_carrier,
    device_network_type,
    device_operating_system,
    device_operating_system_version,
    device_vendor_id,
    device_advertising_id,
    device_system_language,
    device_time_zone_offset_seconds,
    device_ua_browser,
    device_ua_browser_version,
    device_ua_os,
    device_ua_os_version,
    device_ua_device,
    device_ua_device_category,
    device_screen_width,
    device_screen_height,
    device_viewport_width,
    device_viewport_height,
    device_ua.string::varchar as device_ua_string,
    geo_continent,
    geo_sub_continent,
    geo_country,
    geo_region,
    geo_metro,
    geo_city,
    geo_locale,
    traffic_source_source,
    traffic_source_medium,
    traffic_source_campaign,
    traffic_source_content,
    traffic_source_term,
    traffic_source_campaign_id,
    traffic_source_clid_platform,
    traffic_source_clid,
    traffic_source_channel_group,
    traffic_source_category,
    user_first_touch_time_msec,
    app_package_id,
    app_version,
    app_title,
    app_install_source,
    platform,
    project_id,
    app_id,
    screen_view_screen_name,
    screen_view_screen_id,
    screen_view_screen_unique_id,
    screen_view_previous_screen_name,
    screen_view_previous_screen_id,
    screen_view_previous_screen_unique_id,
    screen_view_previous_time_msec,
    screen_view_engagement_time_msec,
    case when screen_view_entrances then 'true' else 'false' end as screen_view_entrances,
    page_view_page_referrer,
    page_view_page_referrer_title,
    page_view_previous_time_msec,
    page_view_engagement_time_msec,
    page_view_page_title,
    page_view_page_url,
    page_view_page_url_path,
    page_view_hostname,
    page_view_latest_referrer,
    page_view_latest_referrer_host,
    case when page_view_entrances then 'true' else 'false' end as page_view_entrances,
    case when app_start_is_first_time then 'true' else 'false' end as app_start_is_first_time,
    upgrade_previous_app_version,
    upgrade_previous_os_version,
    search_key,
    search_term,
    outbound_link_classes,
    outbound_link_domain,
    outbound_link_id,
    outbound_link_url,
    case when outbound_link then 'true' else 'false' end as outbound_link,
    user_engagement_time_msec,
    scroll_engagement_time_msec,
    sdk_error_code,
    sdk_error_message,
    sdk_version,
    sdk_name,
    app_exception_message,
    app_exception_stack,
    custom_parameters_json_str,
    custom_parameters,
    e.session_duration,
    s.session_number,
    s.session_start_time_msec,
    session_source,
    session_medium,
    session_campaign,
    session_content,
    session_term,
    session_campaign_id,
    session_clid_platform,
    session_clid,
    session_channel_group,
    session_source_category,
    CASE WHEN event_name IN ('_page_view', '_screen_view') THEN e.session_id ELSE NULL END as view_session_indicator,
    CASE WHEN event_name IN ('_page_view', '_screen_view') THEN e.event_id ELSE NULL END as view_event_indicator
  from {{database_name}}.{{schema}}.event_v2 e
  join {{database_name}}.{{schema}}.session_m_view s 
    on e.user_pseudo_id = s.user_pseudo_id and e.session_id = s.session_id
  where e.create_time > rec.start_time and e.create_time <= rec.end_time
  and e.event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days' --reduce scan range
  ;

  MERGE INTO {{database_name}}.{{schema}}.clickstream_event_base_view
  USING clickstream_event_base_view_stage as stage on clickstream_event_base_view.event_timestamp = stage.event_timestamp and clickstream_event_base_view.event_id = stage.event_id
  WHEN MATCHED THEN 
  UPDATE SET session_id = stage.session_id
  WHEN NOT MATCHED THEN
  INSERT (
    event_timestamp,
    event_id,
    event_time_msec,
    event_name,
    user_pseudo_id,
    user_id,
    session_id,
    event_value,
    event_value_currency,
    event_bundle_sequence_id,
    ingest_time_msec,
    create_time,
    device_mobile_brand_name,
    device_mobile_model_name,
    device_manufacturer,
    device_carrier,
    device_network_type,
    device_operating_system,
    device_operating_system_version,
    device_vendor_id,
    device_advertising_id,
    device_system_language,
    device_time_zone_offset_seconds,
    device_ua_browser,
    device_ua_browser_version,
    device_ua_os,
    device_ua_os_version,
    device_ua_device,
    device_ua_device_category,
    device_screen_width,
    device_screen_height,
    device_viewport_width,
    device_viewport_height,
    device_ua_string,
    geo_continent,
    geo_sub_continent,
    geo_country,
    geo_region,
    geo_metro,
    geo_city,
    geo_locale,
    traffic_source_source,
    traffic_source_medium,
    traffic_source_campaign,
    traffic_source_content,
    traffic_source_term,
    traffic_source_campaign_id,
    traffic_source_clid_platform,
    traffic_source_clid,
    traffic_source_channel_group,
    traffic_source_category,
    user_first_touch_time_msec,
    app_package_id,
    app_version,
    app_title,
    app_install_source,
    platform,
    project_id,
    app_id,
    screen_view_screen_name,
    screen_view_screen_id,
    screen_view_screen_unique_id,
    screen_view_previous_screen_name,
    screen_view_previous_screen_id,
    screen_view_previous_screen_unique_id,
    screen_view_previous_time_msec,
    screen_view_engagement_time_msec,
    screen_view_entrances,
    page_view_page_referrer,
    page_view_page_referrer_title,
    page_view_previous_time_msec,
    page_view_engagement_time_msec,
    page_view_page_title,
    page_view_page_url,
    page_view_page_url_path,
    page_view_hostname,
    page_view_latest_referrer,
    page_view_latest_referrer_host,
    page_view_entrances,
    app_start_is_first_time,
    upgrade_previous_app_version,
    upgrade_previous_os_version,
    search_key,
    search_term,
    outbound_link_classes,
    outbound_link_domain,
    outbound_link_id,
    outbound_link_url,
    outbound_link,
    user_engagement_time_msec,
    scroll_engagement_time_msec,
    sdk_error_code,
    sdk_error_message,
    sdk_version,
    sdk_name,
    app_exception_message,
    app_exception_stack,
    custom_parameters_json_str,
    custom_parameters,
    session_duration,
    session_number,
    session_start_time_msec,
    session_source,
    session_medium,
    session_campaign,
    session_content,
    session_term,
    session_campaign_id,
    session_clid_platform,
    session_clid,
    session_channel_group,
    session_source_category,
    view_session_indicator,
    view_event_indicator
  )
  VALUES (  
    stage.event_timestamp,
    stage.event_id,
    stage.event_time_msec,
    stage.event_name,
    stage.user_pseudo_id,
    stage.user_id,
    stage.session_id,
    stage.event_value,
    stage.event_value_currency,
    stage.event_bundle_sequence_id,
    stage.ingest_time_msec,
    stage.create_time,
    stage.device_mobile_brand_name,
    stage.device_mobile_model_name,
    stage.device_manufacturer,
    stage.device_carrier,
    stage.device_network_type,
    stage.device_operating_system,
    stage.device_operating_system_version,
    stage.device_vendor_id,
    stage.device_advertising_id,
    stage.device_system_language,
    stage.device_time_zone_offset_seconds,
    stage.device_ua_browser,
    stage.device_ua_browser_version,
    stage.device_ua_os,
    stage.device_ua_os_version,
    stage.device_ua_device,
    stage.device_ua_device_category,
    stage.device_screen_width,
    stage.device_screen_height,
    stage.device_viewport_width,
    stage.device_viewport_height,
    stage.device_ua_string,
    stage.geo_continent,
    stage.geo_sub_continent,
    stage.geo_country,
    stage.geo_region,
    stage.geo_metro,
    stage.geo_city,
    stage.geo_locale,
    stage.traffic_source_source,
    stage.traffic_source_medium,
    stage.traffic_source_campaign,
    stage.traffic_source_content,
    stage.traffic_source_term,
    stage.traffic_source_campaign_id,
    stage.traffic_source_clid_platform,
    stage.traffic_source_clid,
    stage.traffic_source_channel_group,
    stage.traffic_source_category,
    stage.user_first_touch_time_msec,
    stage.app_package_id,
    stage.app_version,
    stage.app_title,
    stage.app_install_source,
    stage.platform,
    stage.project_id,
    stage.app_id,
    stage.screen_view_screen_name,
    stage.screen_view_screen_id,
    stage.screen_view_screen_unique_id,
    stage.screen_view_previous_screen_name,
    stage.screen_view_previous_screen_id,
    stage.screen_view_previous_screen_unique_id,
    stage.screen_view_previous_time_msec,
    stage.screen_view_engagement_time_msec,
    stage.screen_view_entrances,
    stage.page_view_page_referrer,
    stage.page_view_page_referrer_title,
    stage.page_view_previous_time_msec,
    stage.page_view_engagement_time_msec,
    stage.page_view_page_title,
    stage.page_view_page_url,
    stage.page_view_page_url_path,
    stage.page_view_hostname,
    stage.page_view_latest_referrer,
    stage.page_view_latest_referrer_host,
    stage.page_view_entrances,
    stage.app_start_is_first_time,
    stage.upgrade_previous_app_version,
    stage.upgrade_previous_os_version,
    stage.search_key,
    stage.search_term,
    stage.outbound_link_classes,
    stage.outbound_link_domain,
    stage.outbound_link_id,
    stage.outbound_link_url,
    stage.outbound_link,
    stage.user_engagement_time_msec,
    stage.scroll_engagement_time_msec,
    stage.sdk_error_code,
    stage.sdk_error_message,
    stage.sdk_version,
    stage.sdk_name,
    stage.app_exception_message,
    stage.app_exception_stack,
    stage.custom_parameters_json_str,
    stage.custom_parameters,
    stage.session_duration,
    stage.session_number,
    stage.session_start_time_msec,
    stage.session_source,
    stage.session_medium,
    stage.session_campaign,
    stage.session_content,
    stage.session_term,
    stage.session_campaign_id,
    stage.session_clid_platform,
    stage.session_clid,
    stage.session_channel_group,
    stage.session_source_category,
    stage.view_session_indicator,
    stage.view_event_indicator
  );

  drop table clickstream_event_base_view_stage;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('clickstream_event_base_view', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$
;
