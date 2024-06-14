CREATE OR REPLACE PROCEDURE {{schema}}.sp_merge_item_v2(manifestFileName varchar(65535), iam_role varchar(65535)) 
NONATOMIC AS 
$$ 
DECLARE
	log_name varchar(50) := 'sp_merge_item_v2';
BEGIN

	CREATE temp TABLE item_v2_stage (like {{schema}}.item_v2);

	CREATE temp TABLE item_v2_stage_1 (like {{schema}}.item_v2);

	EXECUTE 'COPY item_v2_stage FROM ''' || manifestFileName || ''' IAM_ROLE ''' || iam_role || ''' STATUPDATE ON FORMAT AS PARQUET SERIALIZETOJSON MANIFEST ACCEPTINVCHARS';

	ALTER TABLE item_v2_stage
	DROP COLUMN created_time;

	ALTER TABLE item_v2_stage
	ADD COLUMN created_time timestamp DEFAULT getdate();	

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
					created_time
			FROM (
					select
							*,
							row_number() over (partition by user_pseudo_id, event_id, item_id, event_timestamp order by created_time desc) as row_num
					FROM (
							SELECT
									a.*
							FROM
									item_v2_stage a
							JOIN (
									SELECT 
											user_pseudo_id, 
											event_id,
											item_id,
											event_timestamp
									FROM
											item_v2_stage
									GROUP BY
											user_pseudo_id, 
											event_id,
											item_id,
											event_timestamp
									HAVING
											count(*) > 1
							) b ON (
									a.event_id = b.event_id AND
									a.event_timestamp = b.event_timestamp AND
									a.user_pseudo_id = b.user_pseudo_id AND
									a.item_id = b.item_id
							)
					)
			)
			WHERE
				row_num = 1
	);

	DELETE FROM item_v2_stage
	WHERE (event_id, event_timestamp, user_pseudo_id, item_id) IN (
    SELECT event_id, event_timestamp, user_pseudo_id, item_id
    FROM item_v2_stage_1
    GROUP BY event_id, event_timestamp, user_pseudo_id, item_id
	);

	MERGE INTO {{schema}}.item_v2
	USING item_v2_stage_1 AS stage ON (
		{{schema}}.item_v2.event_id = stage.event_id AND 
		{{schema}}.item_v2.user_pseudo_id = stage.user_pseudo_id AND 
		{{schema}}.item_v2.item_id = stage.item_id AND 
		{{schema}}.item_v2.event_timestamp = stage.event_timestamp
	)
	REMOVE DUPLICATES;

	MERGE INTO {{schema}}.item_v2
	USING item_v2_stage AS stage ON (
		{{schema}}.item_v2.event_id = stage.event_id AND 
		{{schema}}.item_v2.user_pseudo_id = stage.user_pseudo_id AND 
		{{schema}}.item_v2.item_id = stage.item_id AND 
		{{schema}}.item_v2.event_timestamp = stage.event_timestamp
	)
	REMOVE DUPLICATES;	

	CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'info', 'Merge data into item v2 table successfully. manifestFileName: ' || manifestFileName);

	DROP TABLE item_v2_stage;
	DROP TABLE item_v2_stage_1;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log_non_atomic}}(log_name, 'error', 'manifestFileName: ' || manifestFileName || ', error message:' || SQLERRM);
END;
$$ LANGUAGE plpgsql;