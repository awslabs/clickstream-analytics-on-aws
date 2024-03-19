CREATE MATERIALIZED VIEW {{schema}}.user_m_view_v2
BACKUP YES
DISTSTYLE ALL
SORTKEY(user_pseudo_id)
AUTO REFRESH NO AS
SELECT  u.user_pseudo_id
       ,u.event_timestamp,
       ,MAX(user_id) user_id
       ,MAX(user_properties) user_properties
       ,MAX(user_properties_json_str) user_properties_json_str
       ,MAX(first_touch_time_msec) first_touch_time_msec
       ,MAX(first_visit_date) first_visit_date
       ,MAX(first_referrer) first_referrer
       ,MAX(first_traffic_source) first_traffic_source
       ,MAX(first_traffic_medium) first_traffic_medium
       ,MAX(first_traffic_campaign) first_traffic_campaign
       ,MAX(first_traffic_content) first_traffic_content
       ,MAX(first_traffic_term) first_traffic_term
       ,MAX(first_traffic_campaign_id) first_traffic_campaign_id
       ,MAX(first_traffic_clid_platform) first_traffic_clid_platform
       ,MAX(first_traffic_clid) first_traffic_clid
       ,MAX(first_traffic_channel_group) first_traffic_channel_group
       ,MAX(first_traffic_category) first_traffic_category
       ,MAX(first_app_install_source) first_app_install_source
FROM {{schema}}.user_v2 u, {{schema}}.user_m_max_view m
WHERE u.user_pseudo_id = m.user_pseudo_id
AND u.event_timestamp = m.event_timestamp
GROUP BY  u.user_pseudo_id
         ,u.event_timestamp;