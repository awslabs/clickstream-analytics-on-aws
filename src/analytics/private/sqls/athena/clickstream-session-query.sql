-- run following command to load latest partition
-- msck repair table {{database}}.event_v2;
-- msck repair table {{database}}.user_v2;
-- msck repair table {{database}}.item_v2;
-- msck repair table {{database}}.session;

SELECT
  event_timestamp,
  user_pseudo_id,
  session_id,
  user_id,
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
  session_source_category
FROM 
  {{database}}.session
where partition_app = ? 
  and partition_year >= ?
  and partition_month >= ?
  and partition_day >= ?