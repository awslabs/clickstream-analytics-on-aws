CREATE OR REPLACE PROCEDURE {{schema}}.sp_merge_session(manifestFileName varchar(65535), iam_role varchar(65535)) 
AS 
$$ 
DECLARE
	log_name varchar(50) := 'sp_merge_session';
BEGIN

	CREATE temp TABLE session_stage (like {{schema}}.session);
	CREATE temp TABLE session_stage_1 (like {{schema}}.session);

	EXECUTE 'COPY session_stage FROM ''' || manifestFileName || ''' IAM_ROLE ''' || iam_role || ''' STATUPDATE ON FORMAT AS PARQUET SERIALIZETOJSON MANIFEST ACCEPTINVCHARS'; 

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Copy ods data into session stage table successfully.');

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
			CURRENT_TIMESTAMP as created_time
		FROM (
			select
					*,
					row_number() over (partition by user_pseudo_id, session_id, event_timestamp order by created_time desc) as row_num
			FROM
					session_stage
		)
		WHERE
				row_num = 1
	);

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Remove duplicates from session stage table successfully.');

	MERGE INTO {{schema}}.session
	USING session_stage_1 AS stage ON (
		{{schema}}.session.user_pseudo_id = stage.user_pseudo_id AND 
		{{schema}}.session.session_id = stage.session_id AND
		{{schema}}.session.event_timestamp = stage.event_timestamp
	)
	REMOVE DUPLICATES;

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Merge data into session table successfully.');

	DROP TABLE session_stage;
	DROP TABLE session_stage_1;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);	
END;
$$ LANGUAGE plpgsql;