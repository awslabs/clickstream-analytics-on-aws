CREATE OR REPLACE VIEW {{database_name}}.{{schema}}.{{viewName}}
AS
SELECT
  e.*,
  u.user_id as latest_user_id,
  u.first_touch_time_msec,
  u.first_visit_date,
  u.first_referrer,
  u.first_traffic_category,
  u.first_traffic_source,
  u.first_traffic_medium,
  u.first_traffic_campaign,
  u.first_traffic_content,
  u.first_traffic_term,
  u.first_traffic_campaign_id,
  u.first_traffic_clid_platform,
  u.first_traffic_clid,
  u.first_traffic_channel_group,
  u.first_app_install_source,
  u.user_properties_json_str,
  u.user_properties,
  COALESCE(u.user_id, e.user_pseudo_id) as merged_user_id,
  CASE WHEN event_name = '_first_open' THEN COALESCE(u.user_id, e.user_pseudo_id) ELSE NULL END as new_user_indicator,
  CASE WHEN e.event_timestamp::date = u.first_visit_date THEN 'true' else 'false' END as is_first_day_event
FROM 
    {{database_name}}.{{schema}}.clickstream_event_base_view as e
JOIN 
    {{database_name}}.{{schema}}.user_v2 as u ON e.user_pseudo_id = u.user_pseudo_id;
