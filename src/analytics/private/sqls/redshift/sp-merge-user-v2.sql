CREATE OR REPLACE PROCEDURE {{schema}}.sp_merge_user_v2(manifestFileName varchar(65535), iam_role varchar(65535)) 
NONATOMIC AS 
$$ 
DECLARE
	log_name varchar(50) := 'sp_merge_user_v2';
BEGIN

	CREATE temp TABLE user_v2_stage (like {{schema}}.user_v2);
	CREATE temp TABLE user_v2_stage_1 (like {{schema}}.user_v2);

  EXECUTE 'COPY user_v2_stage FROM ''' || manifestFileName || ''' IAM_ROLE ''' || iam_role || ''' STATUPDATE ON FORMAT AS PARQUET SERIALIZETOJSON MANIFEST ACCEPTINVCHARS'; 

	ALTER TABLE user_v2_stage
	DROP COLUMN created_time;

	ALTER TABLE user_v2_stage
	ADD COLUMN created_time timestamp DEFAULT getdate();

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
			created_time
		FROM (
				select
						*,
						row_number() over (partition by user_pseudo_id order by event_timestamp desc) as row_num
				FROM (
						SELECT
								a.*
						FROM
								user_v2_stage a
						JOIN (
								SELECT 
										user_pseudo_id
								FROM
										user_v2_stage
								GROUP BY
										user_pseudo_id
								HAVING
										count(*) > 1
						) b ON (
								a.user_pseudo_id = b.user_pseudo_id
						)
				) 						
		)
		WHERE
				row_num = 1
	);

	DELETE FROM user_v2_stage
	WHERE (user_pseudo_id) IN (
    SELECT user_pseudo_id
    FROM user_v2_stage_1
    GROUP BY user_pseudo_id
	);

	MERGE INTO {{schema}}.user_v2
	USING user_v2_stage_1 AS stage ON ({{schema}}.user_v2.user_pseudo_id = stage.user_pseudo_id)
	REMOVE DUPLICATES;

	MERGE INTO {{schema}}.user_v2
	USING user_v2_stage AS stage ON ({{schema}}.user_v2.user_pseudo_id = stage.user_pseudo_id)
	REMOVE DUPLICATES;	

	CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'Merge data into user v2 table successfully. manifestFileName: ' || manifestFileName);
	DROP TABLE user_v2_stage;
	DROP TABLE user_v2_stage_1;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'error', 'manifestFileName: ' || manifestFileName || ', error message:' || SQLERRM);
END;
$$ LANGUAGE plpgsql;