CREATE OR REPLACE PROCEDURE {{schema}}.sp_merge_item_v2(manifestFileName varchar(65535), iam_role varchar(65535)) 
AS 
$$ 
DECLARE
	log_name varchar(50) := 'sp_merge_item_v2';
BEGIN

	CREATE temp TABLE item_v2_stage (like {{schema}}.item_v2);

	CREATE temp TABLE item_v2_stage_1 (like {{schema}}.item_v2);

	EXECUTE 'COPY item_v2_stage FROM ''' || manifestFileName || ''' IAM_ROLE ''' || iam_role || ''' STATUPDATE ON FORMAT AS PARQUET SERIALIZETOJSON MANIFEST ACCEPTINVCHARS'; 

	INSERT INTO item_v2_stage_1 (
			SELECT
					event_timestamp,
					event_id,
					event_name,
					platform,
					user_pseudo_id,
					user_id,
					item_id,
					name,
					brand,
					currency,
					price,
					quantity,
					creative_name,
					creative_slot,
					location_id,
					category,
					category2,
					category3,
					category4,
					category5,
					custom_parameters_json_str,
					custom_parameters,
					process_info,
					CURRENT_TIMESTAMP as created_time
			FROM (
					select
							*,
							row_number() over (partition by user_pseudo_id, event_id, item_id, event_timestamp order by created_time desc) as row_num
					FROM
							item_v2_stage
			)
			WHERE
					row_num = 1
	);

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Copy ods data into item v2 stage table successfully.');

	MERGE INTO {{schema}}.item_v2
	USING item_v2_stage_1 AS stage ON (
		{{schema}}.item_v2.event_id = stage.event_id AND 
		{{schema}}.item_v2.user_pseudo_id = stage.user_pseudo_id AND 
		{{schema}}.item_v2.item_id = stage.item_id AND 
		{{schema}}.item_v2.event_timestamp = stage.event_timestamp
	)
	REMOVE DUPLICATES;

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Merge data into item v2 table successfully.');

	DROP TABLE item_v2_stage;
	DROP TABLE item_v2_stage_1;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);	
END;
$$ LANGUAGE plpgsql;