CREATE OR REPLACE PROCEDURE {{schema}}.sp_merge_session(manifestFileName varchar(65535), iam_role varchar(65535)) 
AS 
$$ 
DECLARE
	log_name varchar(50) := 'sp_merge_session';
BEGIN

	CREATE temp TABLE session_stage (like {{schema}}.session);

	EXECUTE 'COPY session_stage FROM ''' || manifestFileName || ''' IAM_ROLE ''' || iam_role || ''' STATUPDATE ON FORMAT AS PARQUET SERIALIZETOJSON MANIFEST ACCEPTINVCHARS'; 


	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Copy ods data into session stage table successfully.');

	MERGE INTO {{schema}}.session
	USING session_stage AS stage ON (
		{{schema}}.session.user_pseudo_id = stage.user_pseudo_id AND 
		{{schema}}.session.session_id = stage.session_id AND
		{{schema}}.session.event_timestamp = stage.event_timestamp
	)
	WHEN MATCHED THEN
	UPDATE SET 
			created_time = CURRENT_TIMESTAMP
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
			CURRENT_TIMESTAMP
	);
	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Merge data into session table successfully.');

	DROP TABLE session_stage;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);	
END;
$$ LANGUAGE plpgsql;