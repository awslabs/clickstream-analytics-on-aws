CREATE MATERIALIZED VIEW {{schema}}.user_m_view_v2 
BACKUP YES 
DISTSTYLE ALL
SORTKEY(user_pseudo_id) 
AUTO REFRESH NO 
AS
SELECT *
FROM (
		SELECT user_pseudo_id,
			user_id,
			user_properties,
			user_properties_json_str,
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
			ROW_NUMBER() OVER (
				PARTITION BY user_pseudo_id
				ORDER BY event_timestamp DESC
			) AS row_number
		FROM {{schema}}.user_v2
	)
WHERE row_number = 1;