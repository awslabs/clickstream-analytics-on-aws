CREATE OR REPLACE PROCEDURE {{schema}}.sp_merge_item_v2(manifestFileName varchar(65535), iam_role varchar(65535)) 
AS 
$$ 
DECLARE
	log_name varchar(50) := 'sp_merge_item_v2';
BEGIN

	CREATE temp TABLE item_v2_stage (like {{schema}}.item_v2);

	EXECUTE 'COPY item_v2_stage FROM ''' || manifestFileName || ''' IAM_ROLE ''' || iam_role || ''' STATUPDATE ON FORMAT AS PARQUET SERIALIZETOJSON MANIFEST ACCEPTINVCHARS'; 

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Copy ods data into item v2 stage table successfully.');

	MERGE INTO {{schema}}.item_v2
	USING item_v2_stage AS stage ON ({{schema}}.item_v2.event_id = stage.event_id AND {{schema}}.item_v2.user_pseudo_id = stage.user_pseudo_id AND {{schema}}.item_v2.item_id = stage.item_id)
	WHEN MATCHED THEN
	UPDATE SET 
			created_time = CURRENT_TIMESTAMP
	WHEN NOT MATCHED THEN
	INSERT (
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
	) VALUES (
			stage.event_timestamp,
			stage.event_id,
			stage.event_name,
			stage.platform,
			stage.user_pseudo_id,
			stage.user_id,
			stage.item_id,
			stage.name,
			stage.brand,
			stage.currency,
			stage.price,
			stage.quantity,
			stage.creative_name,
			stage.creative_slot,
			stage.location_id,
			stage.category,
			stage.category2,
			stage.category3,
			stage.category4,
			stage.category5,
			stage.custom_parameters_json_str,
			stage.custom_parameters,
			stage.process_info,
			CURRENT_TIMESTAMP
	);
	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Merge data into item v2 table successfully.');

	DROP TABLE item_v2_stage;
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);	
END;
$$ LANGUAGE plpgsql;