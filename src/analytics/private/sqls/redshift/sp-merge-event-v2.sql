CREATE OR REPLACE PROCEDURE {{schema}}.sp_merge_event_v2(manifestFileName varchar(65535), iam_role varchar(65535)) 
NONATOMIC AS 
$$ 
DECLARE
	log_name varchar(50) := 'sp_merge_event_v2';
BEGIN
	CREATE temp TABLE event_v2_stage (like {{schema}}.event_v2);
	CREATE temp TABLE event_v2_stage_1 (like {{schema}}.event_v2);

	EXECUTE 'COPY event_v2_stage FROM ''' || manifestFileName || ''' IAM_ROLE ''' || iam_role || ''' STATUPDATE ON FORMAT AS PARQUET SERIALIZETOJSON MANIFEST ACCEPTINVCHARS'; 

	ALTER TABLE event_v2_stage
	DROP COLUMN created_time;

	ALTER TABLE event_v2_stage
	ADD COLUMN created_time timestamp DEFAULT getdate();

	INSERT INTO event_v2_stage_1 (
			SELECT
					event_timestamp, 
					event_id, 
					event_time_msec, 
					event_name, 
					event_value, 
					event_value_currency, 
					event_bundle_sequence_id, 
					ingest_time_msec, 
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
					device_ua,
					device_screen_width,
					device_screen_height,
					device_viewport_width,
					device_viewport_height,
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
					page_view_page_url_query_parameters,
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
					user_id,
					user_pseudo_id,
					session_id,
					session_start_time_msec,
					session_duration,
					session_number,
					scroll_engagement_time_msec,
					sdk_error_code,
					sdk_error_message,
					sdk_version,
					sdk_name,
					app_exception_message,
					app_exception_stack,
					custom_parameters_json_str,
					custom_parameters,
					process_info,
					created_time
			FROM (
					SELECT
							*,
							row_number() over (partition by event_id, event_timestamp order by created_time desc) as row_num
					FROM (
						SELECT
							a.*
						FROM
							event_v2_stage a
						JOIN (
							SELECT 
								event_id, 
								event_timestamp
							FROM
								event_v2_stage
							GROUP BY
								event_id,
								event_timestamp
							HAVING
								count(*) > 1
						) b ON (
							a.event_id = b.event_id AND
							a.event_timestamp = b.event_timestamp
						)
					)	
			)
			WHERE
					row_num = 1
	);

	DELETE FROM event_v2_stage
	WHERE (event_id, event_timestamp) IN (
    SELECT event_id, event_timestamp
    FROM event_v2_stage_1
    GROUP BY event_id, event_timestamp
	);

	MERGE INTO {{schema}}.event_v2
	USING event_v2_stage_1 AS stage ON (
		{{schema}}.event_v2.event_id = stage.event_id AND 
		{{schema}}.event_v2.event_timestamp = stage.event_timestamp
	)	
	REMOVE DUPLICATES;

	MERGE INTO {{schema}}.event_v2
	USING event_v2_stage AS stage ON (
		{{schema}}.event_v2.event_id = stage.event_id AND 
		{{schema}}.event_v2.event_timestamp = stage.event_timestamp
	)	
	REMOVE DUPLICATES;	
	CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'Merge data into event v2 table successfully. manifestFileName: ' || manifestFileName);

	DROP TABLE event_v2_stage;
	DROP TABLE event_v2_stage_1;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'error', 'manifestFileName: ' || manifestFileName || ', error message:' || SQLERRM);	
END;
$$ LANGUAGE plpgsql;