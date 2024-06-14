CREATE OR REPLACE PROCEDURE {{schema}}.sp_merge_session(manifestFileName varchar(65535), iam_role varchar(65535)) 
NONATOMIC AS 
$$ 
DECLARE
	log_name varchar(50) := 'sp_merge_session';
BEGIN

	CREATE temp TABLE session_stage (like {{schema}}.session);
	CREATE temp TABLE session_stage_1 (like {{schema}}.session);

	EXECUTE 'COPY session_stage FROM ''' || manifestFileName || ''' IAM_ROLE ''' || iam_role || ''' STATUPDATE ON FORMAT AS PARQUET SERIALIZETOJSON MANIFEST ACCEPTINVCHARS'; 

	ALTER TABLE session_stage
	DROP COLUMN created_time;

	ALTER TABLE session_stage
	ADD COLUMN created_time timestamp DEFAULT getdate();		

	INSERT INTO session_stage_1 (
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
			session_source_category,
			process_info,
			created_time
		FROM (
			select
					*,
					ROW_NUMBER() OVER (
						PARTITION BY user_pseudo_id, session_id 
						ORDER BY
							CASE 
								WHEN session_source IS NULL
									THEN 2
								WHEN session_source = 'Direct'
									THEN 1
								ELSE 0
							END,
							created_time
					) AS row_num
			FROM (
					SELECT
							a.*
					FROM
							session_stage a
					JOIN (
							SELECT 
									user_pseudo_id, 
									session_id
							FROM
									session_stage
							GROUP BY
									user_pseudo_id,
									session_id
							HAVING
									count(*) > 1
					) b ON (
							a.user_pseudo_id = b.user_pseudo_id AND
							a.session_id = b.session_id
					)
			) 					
		)
		WHERE
				row_num = 1
	);

	DELETE FROM session_stage
	WHERE (user_pseudo_id, session_id) IN (
    SELECT user_pseudo_id, session_id
    FROM session_stage_1
    GROUP BY user_pseudo_id, session_id
	);

	MERGE INTO {{schema}}.session
	USING session_stage_1 AS stage ON (
		{{schema}}.session.user_pseudo_id = stage.user_pseudo_id AND 
		{{schema}}.session.session_id = stage.session_id
	)
	WHEN MATCHED THEN
		UPDATE SET
			event_timestamp = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.event_timestamp
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.event_timestamp
				ELSE {{schema}}.session.event_timestamp
			END,
			user_id = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.user_id
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.user_id
				ELSE {{schema}}.session.user_id
			END,
			session_number = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_number
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_number
				ELSE {{schema}}.session.session_number
			END,
			session_start_time_msec = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_start_time_msec
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_start_time_msec
				ELSE {{schema}}.session.session_start_time_msec
			END,
			session_source = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_source
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_source
				ELSE {{schema}}.session.session_source
			END,
			session_medium = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_medium
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_medium
				ELSE {{schema}}.session.session_medium
			END,
			session_campaign = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_campaign
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_campaign
				ELSE {{schema}}.session.session_campaign
			END,
			session_content = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_content
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_content
				ELSE {{schema}}.session.session_content
			END,
			session_term = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_term
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_term
				ELSE {{schema}}.session.session_term
			END,
			session_campaign_id = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_campaign_id
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_campaign_id
				ELSE {{schema}}.session.session_campaign_id
			END,
			session_clid_platform = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_clid_platform
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_clid_platform
				ELSE {{schema}}.session.session_clid_platform
			END,
			session_clid = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_clid
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_clid
				ELSE {{schema}}.session.session_clid
			END,
			session_channel_group = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_channel_group
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_channel_group
				ELSE {{schema}}.session.session_channel_group
			END,
			session_source_category = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_source_category
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_source_category
				ELSE {{schema}}.session.session_source_category
			END,
			process_info = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.process_info
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.process_info
				ELSE {{schema}}.session.process_info
			END,
			created_time = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.created_time
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.created_time
				ELSE {{schema}}.session.created_time
			END
	WHEN NOT MATCHED THEN
		INSERT (
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
			session_source_category,
			process_info,
			created_time
		) VALUES (
			stage.event_timestamp,
			stage.user_pseudo_id,
			stage.session_id,
			stage.user_id,
			stage.session_number,
			stage.session_start_time_msec,
			stage.session_source,
			stage.session_medium,
			stage.session_campaign,
			stage.session_content,
			stage.session_term,
			stage.session_campaign_id,
			stage.session_clid_platform,
			stage.session_clid,
			stage.session_channel_group,
			stage.session_source_category,
			stage.process_info,
			stage.created_time
		);

	MERGE INTO {{schema}}.session
	USING session_stage AS stage ON (
		{{schema}}.session.user_pseudo_id = stage.user_pseudo_id AND 
		{{schema}}.session.session_id = stage.session_id
	)
	WHEN MATCHED THEN
		UPDATE SET
			event_timestamp = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.event_timestamp
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.event_timestamp
				ELSE {{schema}}.session.event_timestamp
			END,
			user_id = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.user_id
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.user_id
				ELSE {{schema}}.session.user_id
			END,
			session_number = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_number
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_number
				ELSE {{schema}}.session.session_number
			END,
			session_start_time_msec = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_start_time_msec
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_start_time_msec
				ELSE {{schema}}.session.session_start_time_msec
			END,
			session_source = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_source
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_source
				ELSE {{schema}}.session.session_source
			END,
			session_medium = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_medium
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_medium
				ELSE {{schema}}.session.session_medium
			END,
			session_campaign = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_campaign
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_campaign
				ELSE {{schema}}.session.session_campaign
			END,
			session_content = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_content
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_content
				ELSE {{schema}}.session.session_content
			END,
			session_term = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_term
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_term
				ELSE {{schema}}.session.session_term
			END,
			session_campaign_id = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_campaign_id
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_campaign_id
				ELSE {{schema}}.session.session_campaign_id
			END,
			session_clid_platform = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_clid_platform
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_clid_platform
				ELSE {{schema}}.session.session_clid_platform
			END,
			session_clid = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_clid
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_clid
				ELSE {{schema}}.session.session_clid
			END,
			session_channel_group = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_channel_group
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_channel_group
				ELSE {{schema}}.session.session_channel_group
			END,
			session_source_category = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.session_source_category
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.session_source_category
				ELSE {{schema}}.session.session_source_category
			END,
			process_info = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.process_info
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.process_info
				ELSE {{schema}}.session.process_info
			END,
			created_time = CASE
				WHEN 
					{{schema}}.session.session_source IS NULL THEN
						stage.created_time
				WHEN 
					{{schema}}.session.session_source = 'Direct' AND stage.session_source IS NOT NULL THEN
						stage.created_time
				ELSE {{schema}}.session.created_time
			END
	WHEN NOT MATCHED THEN
		INSERT (
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
			session_source_category,
			process_info,
			created_time
		) VALUES (
			stage.event_timestamp,
			stage.user_pseudo_id,
			stage.session_id,
			stage.user_id,
			stage.session_number,
			stage.session_start_time_msec,
			stage.session_source,
			stage.session_medium,
			stage.session_campaign,
			stage.session_content,
			stage.session_term,
			stage.session_campaign_id,
			stage.session_clid_platform,
			stage.session_clid,
			stage.session_channel_group,
			stage.session_source_category,
			stage.process_info,
			stage.created_time
		);		

	CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'Merge data into session table successfully. manifestFileName: ' || manifestFileName);

	DROP TABLE session_stage;
	DROP TABLE session_stage_1;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'error', 'manifestFileName: ' || manifestFileName || ', error message:' || SQLERRM);
END;
$$ LANGUAGE plpgsql;