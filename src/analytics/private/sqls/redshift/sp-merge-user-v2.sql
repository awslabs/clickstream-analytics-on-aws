CREATE OR REPLACE PROCEDURE {{schema}}.sp_merge_user_v2(manifestFileName varchar(65535), iam_role varchar(65535)) 
AS 
$$ 
DECLARE
	log_name varchar(50) := 'sp_merge_user_v2';
BEGIN

	CREATE temp TABLE user_v2_stage (like {{schema}}.user_v2);
	CREATE temp TABLE user_v2_stage_1 (like {{schema}}.user_v2);

  EXECUTE 'COPY user_v2_stage FROM ''' || manifestFileName || ''' IAM_ROLE ''' || iam_role || ''' STATUPDATE ON FORMAT AS PARQUET SERIALIZETOJSON MANIFEST ACCEPTINVCHARS'; 
	
	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Copy ods data into user v2 stage table successfully.');

	INSERT INTO user_v2_stage_1 (
		SELECT
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
			CURRENT_TIMESTAMP as created_time
		FROM (
				select
						*,
						row_number() over (partition by user_pseudo_id order by event_timestamp desc) as row_num
				FROM
						user_v2_stage
		)
		WHERE
				row_num = 1
	);

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Remove duplicates from user v2 stage table successfully.');

	MERGE INTO {{schema}}.user_v2
	USING user_v2_stage_1 AS stage ON ({{schema}}.user_v2.user_pseudo_id = stage.user_pseudo_id)
	REMOVE DUPLICATES;

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Merge data into user v2 table successfully.');

	DROP TABLE user_v2_stage;
	DROP TABLE user_v2_stage_1;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);	
END;
$$ LANGUAGE plpgsql;