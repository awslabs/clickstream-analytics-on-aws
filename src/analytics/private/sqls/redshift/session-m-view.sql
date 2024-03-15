CREATE MATERIALIZED VIEW {{schema}}.session_m_view
BACKUP YES
DISTSTYLE EVEN
SORTKEY (user_pseudo_id, session_start_time_msec, session_id)
AUTO REFRESH NO
AS
SELECT  s.event_timestamp
       ,s.user_pseudo_id
       ,s.session_id
       ,MAX(s.session_number) session_number
       ,MAX(user_id) user_id
       ,MAX(session_start_time_msec) session_start_time_msec
       ,MAX(session_source) session_source
       ,MAX(session_medium) session_medium
       ,MAX(session_campaign) session_campaign
       ,MAX(session_content) session_content
       ,MAX(session_term) session_term
       ,MAX(session_campaign_id) session_campaign_id
       ,MAX(session_clid_platform) session_clid_platform
       ,MAX(session_clid) session_clid
       ,MAX(session_channel_group) session_channel_group
       ,MAX(session_source_category) session_source_category
FROM {{schema}}.session s,
     {{schema}}.session_m_max_view m
WHERE s.user_pseudo_id = m.user_pseudo_id
AND s.session_id = m.session_id
AND s.event_timestamp = m.event_timestamp
GROUP BY  s.user_pseudo_id
         ,s.session_id
         ,s.event_timestamp;