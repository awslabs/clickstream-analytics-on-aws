CREATE OR REPLACE VIEW {{scheam}}.clickstream_event_view_v3 AS
SELECT
  e.*,
  u.user_id,
  first_touch_time_msec,
  first_visit_date,
  first_referrer,
  first_traffic_category,
  first_traffic_source,
  first_traffic_medium,
  first_traffic_campaign,
  first_traffic_content,
  first_traffic_term,
  first_traffic_campaign_id,
  first_traffic_clid_platform,
  first_traffic_clid,
  first_traffic_channel_group,
  first_app_install_source,
  user_properties_json_str
FROM {{scheam}}.clickstream_event_attr_view_v2 e
JOIN {{scheam}}.user_m_view_v2 as u ON e.user_pseudo_id = u.user_pseudo_id
;