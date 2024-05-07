CREATE OR REPLACE PROCEDURE {{schema}}.sp_merge_user_v2(manifestFileName varchar(65535), iam_role varchar(65535)) 
AS 
$$ 
DECLARE
	log_name varchar(50) := 'sp_merge_user_v2';
BEGIN

	CREATE temp TABLE user_v2_stage (like {{schema}}.user_v2);

  EXECUTE 'COPY user_v2_stage FROM ''' || manifestFileName || ''' IAM_ROLE ''' || iam_role || ''' STATUPDATE ON FORMAT AS PARQUET SERIALIZETOJSON MANIFEST ACCEPTINVCHARS'; 
	
	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Copy ods data into user v2 stage table successfully.');

	MERGE INTO {{schema}}.user_v2
	USING user_v2_stage AS stage ON ({{schema}}.user_v2.user_pseudo_id = stage.user_pseudo_id)
	WHEN MATCHED THEN
	UPDATE SET
			user_id = stage.user_id,
			user_properties = stage.user_properties,
			user_properties_json_str = stage.user_properties_json_str,
			first_touch_time_msec = stage.first_touch_time_msec,
			first_visit_date = stage.first_visit_date,
			first_referrer = stage.first_referrer,
			first_traffic_source = stage.first_traffic_source,
			first_traffic_medium = stage.first_traffic_medium,
			first_traffic_campaign = stage.first_traffic_campaign,
			first_traffic_content = stage.first_traffic_content,
			first_traffic_term = stage.first_traffic_term,
			first_traffic_campaign_id = stage.first_traffic_campaign_id,
			first_traffic_clid_platform = stage.first_traffic_clid_platform,
			first_traffic_clid = stage.first_traffic_clid,
			first_traffic_channel_group = stage.first_traffic_channel_group,
			first_traffic_category = stage.first_traffic_category,
			first_app_install_source = stage.first_app_install_source,
			process_info = stage.process_info, 
			created_time = CURRENT_TIMESTAMP
	WHEN NOT MATCHED THEN
	INSERT (
			event_timestamp,
			user_pseudo_id,
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
			process_info,
			created_time
	) VALUES (
			stage.event_timestamp,
			stage.user_pseudo_id,
			stage.user_id,
			stage.user_properties,
			stage.user_properties_json_str,
			stage.first_touch_time_msec,
			stage.first_visit_date,
			stage.first_referrer,
			stage.first_traffic_source,
			stage.first_traffic_medium,
			stage.first_traffic_campaign,
			stage.first_traffic_content,
			stage.first_traffic_term,
			stage.first_traffic_campaign_id,
			stage.first_traffic_clid_platform,
			stage.first_traffic_clid,
			stage.first_traffic_channel_group,
			stage.first_traffic_category,
			stage.first_app_install_source,
			stage.process_info,
			CURRENT_TIMESTAMP
	);
	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Merge data into user v2 table successfully.');

	DROP TABLE user_v2_stage;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);	
END;
$$ LANGUAGE plpgsql;