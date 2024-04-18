-- run following command to load latest partition
-- msck repair table {{database}}.event_v2;
-- msck repair table {{database}}.user_v2;
-- msck repair table {{database}}.item_v2;
-- msck repair table {{database}}.session;

SELECT
 user_pseudo_id,
 user_id,
 event_timestamp,
 first_touch_time_msec,
 first_visit_date,
 first_referrer,
 first_traffic_source,
 first_traffic_medium,
 first_traffic_campaign,
 first_traffic_content,
 first_traffic_term,
 first_traffic_campaign_id,
 first_traffic_clid_platform,
 first_traffic_clid,
 first_traffic_channel_group,
 first_traffic_category,
 first_app_install_source,
 user_properties,
 user_properties_json_str
FROM 
  {{database}}.user_v2
where partition_app = ? 
  and partition_year >= ?
  and partition_month >= ?
  and partition_day >= ?