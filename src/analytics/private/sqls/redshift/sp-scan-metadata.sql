CREATE OR REPLACE PROCEDURE {{schema}}.sp_scan_metadata(top_frequent_properties_limit NUMERIC, day_range NUMERIC) 
AS 
$$ 
DECLARE
  rec RECORD;
  query text;
	log_name varchar(50) := 'sp_scan_metadata';
BEGIN

	-- Drop event_properties_metadata and event_metadata table, the data should be moved into DDB
	DROP TABLE IF EXISTS {{schema}}.event_properties_metadata;
	DROP TABLE IF EXISTS {{schema}}.event_metadata;
	DROP TABLE IF EXISTS {{schema}}.user_attribute_metadata;

  CREATE TABLE IF NOT EXISTS {{schema}}.event_properties_metadata (
    id VARCHAR(255),
		month VARCHAR(255),
    prefix VARCHAR(255),
		project_id VARCHAR(255),
		app_id VARCHAR(255),
		day_number BIGINT,
		category VARCHAR(255),
		event_name VARCHAR(255),
		property_name VARCHAR(255),
    value_type VARCHAR(255),
    value_enum VARCHAR(MAX),
		platform VARCHAR(255)
  );

  CREATE TABLE IF NOT EXISTS {{schema}}.user_attribute_metadata (
    id VARCHAR(255),
		month VARCHAR(255),
    prefix VARCHAR(255),
		project_id VARCHAR(255),
		app_id VARCHAR(255),
		day_number BIGINT,
		category VARCHAR(255),
		property_name VARCHAR(255),
    value_type VARCHAR(255),
    value_enum VARCHAR(MAX)
  );

  CREATE TABLE IF NOT EXISTS {{schema}}.event_metadata (
    id VARCHAR(255),
		month VARCHAR(255),
    prefix VARCHAR(255),
		project_id VARCHAR(255),
		app_id VARCHAR(255),
		day_number BIGINT,
		count BIGINT,
		event_name VARCHAR(255),
		platform VARCHAR(255)
  );    	

  CREATE TEMP TABLE IF NOT EXISTS properties_temp_table (
    event_name VARCHAR(255),
    project_id VARCHAR(255),
    app_info_app_id VARCHAR(255),
		event_date VARCHAR(255),
    property_category VARCHAR(20),
		ingest_timestamp VARCHAR(15),
    property_name VARCHAR(255),
    property_value VARCHAR(255),
    value_type VARCHAR(255),
    platform VARCHAR(255)
  );

	-- Table is for setting the the column of including into metadata
	CREATE TEMPORARY TABLE IF NOT EXISTS property_column_temp_table (column_name VARCHAR);

	INSERT INTO 
		property_column_temp_table (column_name) 
	VALUES 
		('platform'), 
		('project_id');

	-- Table is for setting the the column and the properties that should be included into metadata
	CREATE TEMPORARY TABLE IF NOT EXISTS property_array_temp_table (column_name VARCHAR, property_name VARCHAR);

	INSERT INTO 
		property_array_temp_table (column_name, property_name) 
	VALUES 
		('app_info','app_id'), 
		('app_info','install_source'), 
		('app_info', 'id'), 
		('app_info', 'version'), 
		('device', 'mobile_brand_name'), 
		('device', 'mobile_model_name'), 
		('device', 'manufacturer'), 
		('device', 'screen_width'), 
		('device', 'screen_height'), 
		('device', 'carrier'), 
		('device', 'network_type'), 
		('device', 'operating_system_version'), 
		('device', 'operating_system'), 
		('device', 'ua_browser'), 
		('device', 'ua_browser_version'), 
		('device', 'ua_os'), 
		('device', 'ua_os_version'), 
		('device', 'ua_device'), 
		('device', 'ua_device_category'), 
		('device', 'system_language'), 
		('device', 'time_zone_offset_seconds'), 
		('device', 'vendor_id'), 
		('device', 'advertising_id'), 
		('device', 'host_name'), 
		('device', 'viewport_height'), 
		('device', 'viewport_width'), 
		('geo', 'city'), 
		('geo', 'continent'), 
		('geo', 'country'), 
		('geo', 'metro'), 
		('geo', 'region'),
		('geo', 'sub_continent'), 
		('geo', 'locale'), 
		('traffic_source', 'medium'), 
		('traffic_source', 'name'), 
		('traffic_source', 'source');

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'create temp table successfully.');

	query := 'SELECT column_name FROM property_column_temp_table';
	FOR rec IN EXECUTE query LOOP
		EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_info.app_id::varchar AS app_info_app_id, event_date, ''other'' AS property_category, ingest_timestamp, ''' || quote_ident(rec.column_name) || ''' AS property_name, ' || quote_ident(rec.column_name) || '::varchar AS property_value, ''String'' AS value_type, platform FROM {{schema}}.ods_events WHERE ingest_timestamp >= EXTRACT(epoch FROM DATE_TRUNC(''day'', GETDATE() - INTERVAL ''' || quote_ident(day_range) || ' day'')::timestamp)*1000::bigint AND ingest_timestamp < EXTRACT(epoch FROM DATE_TRUNC(''day'', GETDATE())::timestamp)*1000::bigint)';
	END LOOP;

	query := 'SELECT column_name, property_name FROM property_array_temp_table';
	FOR rec IN EXECUTE query LOOP
		EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_info.app_id::varchar AS app_info_app_id, event_date, ''' || quote_ident(rec.column_name) || ''' AS property_category, ingest_timestamp, ' || quote_literal(rec.property_name) || ' AS property_name, ' || quote_ident(rec.column_name) || '.' || quote_ident(rec.property_name) || '::varchar AS property_value, CASE WHEN ''' || quote_ident(rec.property_name) || '''::varchar IN (''screen_height'', ''screen_width'', ''viewport_height'', ''viewport_width'', ''time_zone_offset_seconds'') THEN ''Integer'' ELSE ''String'' END AS value_type, platform FROM {{schema}}.ods_events WHERE ingest_timestamp >= EXTRACT(epoch FROM DATE_TRUNC(''day'', GETDATE() - INTERVAL ''' || quote_ident(day_range) || ' day'')::timestamp)*1000::bigint AND ingest_timestamp < EXTRACT(epoch FROM DATE_TRUNC(''day'', GETDATE())::timestamp)*1000::bigint)';
	END LOOP;

	INSERT INTO properties_temp_table (
		SELECT
			event_name,
			project_id,
			app_info.app_id::varchar AS app_info_app_id,
			event_date,
			'event' AS property_category,
			ingest_timestamp,
			event_params.key::varchar AS property_name,
			coalesce 
				(nullif(event_params.value.string_value::varchar,'')
			  	, nullif(event_params.value.int_value::varchar,'')
			  	, nullif(event_params.value.float_value::varchar,'')
			  	, nullif(event_params.value.double_value::varchar,'')) AS property_value,
			CASE 
				WHEN event_params.value.string_value::varchar IS NOT NULL THEN 'String'
				WHEN event_params.value.int_value::varchar IS NOT NULL THEN 'Integer'
				WHEN event_params.value.float_value::varchar IS NOT NULL THEN 'Float'
				WHEN event_params.value.double_value::varchar IS NOT NULL THEN 'Double'
			ELSE 'None'
			END AS value_type,
			platform
		FROM {{schema}}.ods_events e, e.event_params AS event_params
		WHERE 
			property_name NOT LIKE '%timestamp%'
			AND ingest_timestamp >= EXTRACT(epoch FROM DATE_TRUNC('day', GETDATE() - INTERVAL '1 day' * day_range)::timestamp)*1000::bigint
			AND ingest_timestamp < EXTRACT(epoch FROM DATE_TRUNC('day', GETDATE())::timestamp)*1000::bigint
	);

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert data into properties_temp_table table successfully.');

	INSERT INTO {{schema}}.event_properties_metadata (id, month, prefix, project_id, app_id, day_number, category, event_name, property_name, value_type, value_enum, platform) 
	SELECT
		project_id || '#' || app_info_app_id || '#' || event_name || '#' || property_name || '#' || value_type AS id,
		month,
		'EVENT_PARAMETER#' || project_id || '#' || app_info_app_id AS prefix,    
		project_id,
		app_info_app_id AS app_id,
		day_number,
		property_category AS category,
		event_name,
		property_name,
		value_type,
		property_values AS value_enum,
		platform
	FROM (
		SELECT
			event_name,
			project_id, 
			app_info_app_id, 
			property_category,
			month, 
			day_number, 
			property_name, 
			value_type, 
			LISTAGG(property_value || '_' || parameter_count, '#') WITHIN GROUP (ORDER BY property_value) as property_values,
			platform
		FROM (
			SELECT
				event_name,
				project_id, 
				app_info_app_id,
				property_category, 
				month, 
				day_number, 
				property_name, 
				property_value, 
				value_type, 
				parameter_count,
				platform
			FROM (
				SELECT
					event_name,
					project_id, 
					app_info_app_id, 
					property_category,
					month, 
					day_number, 
					property_name, 
					property_value, 
					value_type, 
					parameter_count,
					platform,
					ROW_NUMBER() OVER (PARTITION BY event_name, project_id, app_info_app_id, property_category, month, day_number, property_name, value_type, platform ORDER BY parameter_count DESC) AS row_num
				FROM (
					SELECT 
						event_name, 
						project_id, 
						app_info_app_id, 
						property_category, 
						'#' || TO_CHAR(TO_DATE(event_date, 'YYYY-MM-DD'), 'YYYYMM') AS month,
						EXTRACT(DAY FROM TO_DATE(event_date, 'YYYY-MM-DD')) AS day_number,
						property_name,
						property_value, 
						value_type, 
						LISTAGG(DISTINCT platform, '#') WITHIN GROUP (ORDER BY platform) AS platform, 
						count(*) AS parameter_count 
					FROM properties_temp_table
					WHERE 
						property_value IS NOT NULL AND
						property_value != ''
					GROUP BY event_name, project_id, app_info_app_id, property_category, month, day_number, property_name, property_value, value_type
				)
			)
			WHERE 
				row_num <= top_frequent_properties_limit OR
				(event_name = '_page_view' AND property_name IN ('_page_title', '_page_url')) OR
				(event_name = '_screen_view' AND property_name IN ('_screen_name', '_screen_id'))
		)
		GROUP BY event_name, project_id, app_info_app_id, property_category, month, day_number, property_name, value_type, platform
	);

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert all parameters data into event_properties_metadata table successfully.');	

  -- user attribute
	INSERT INTO {{schema}}.user_attribute_metadata (id, month, prefix, project_id, app_id, day_number, category, property_name, value_type, value_enum) 
	SELECT
		project_id || '#' || app_info_app_id || '#' || property_name || '#' || value_type AS id,
		month,
		'USER_ATTRIBUTE#' || project_id || '#' || app_info_app_id AS prefix,
		project_id AS project_id,
		app_info_app_id AS app_id,
		day_number,
		'user' AS category,
		property_name AS property_name,
		value_type AS value_type,
		property_values AS value_enum
	FROM (
		SELECT 
			project_id, 
			app_info_app_id, 
			month, 
			day_number, 
			property_name,
			value_type, 
			LISTAGG(property_value || '_' || parameter_count, '#') WITHIN GROUP (ORDER BY property_value) as property_values
		FROM (
			SELECT 
				project_id, 
				app_info_app_id, 
				month, 
				day_number, 
				property_name, 
				property_value, 
				value_type, 
				parameter_count
			FROM (
				SELECT 
					project_id, 
					app_info_app_id, 
					month, 
					day_number, 
					property_name, 
					property_value, 
					value_type, 
					parameter_count,
					ROW_NUMBER() OVER (PARTITION BY project_id, app_info_app_id, month, day_number, property_name, value_type ORDER BY parameter_count DESC) AS row_num
				FROM (
					SELECT
						project_id,
						app_info.app_id::varchar AS app_info_app_id,
						'#' || TO_CHAR(TO_DATE(event_date, 'YYYY-MM-DD'), 'YYYYMM') AS month,
						EXTRACT(DAY FROM TO_DATE(event_date, 'YYYY-MM-DD')) AS day_number,
						user_properties.key::varchar AS property_name,
						coalesce 
						(
						nullif
							(user_properties.value.string_value::varchar,'')
							, nullif(user_properties.value.int_value::varchar,'')
							, nullif(user_properties.value.float_value::varchar,'')
							, nullif(user_properties.value.double_value::varchar,'')
						) AS property_value,
						CASE 
							WHEN user_properties.value.string_value::varchar IS NOT NULL THEN 'String'
							WHEN user_properties.value.int_value::varchar IS NOT NULL THEN 'Integer'
							WHEN user_properties.value.float_value::varchar IS NOT NULL THEN 'Float'
							WHEN user_properties.value.double_value::varchar IS NOT NULL THEN 'Double'
						ELSE 'None'
						END AS value_type,
						count(*) AS parameter_count
					FROM {{schema}}.ods_events e, e.user_properties AS user_properties
					WHERE 
						property_name NOT LIKE '%timestamp%'
						AND ingest_timestamp >= EXTRACT(epoch FROM DATE_TRUNC('day', GETDATE() - INTERVAL '1 day' * day_range)::timestamp)*1000::bigint
						AND ingest_timestamp < EXTRACT(epoch FROM DATE_TRUNC('day', GETDATE())::timestamp)*1000::bigint
						AND property_value IS NOT NULL
					GROUP BY project_id, app_info_app_id, month, day_number, property_name, property_value, value_type
				)
			)
			WHERE row_num <= top_frequent_properties_limit
		)
		GROUP BY project_id, app_info_app_id, month, day_number, property_name, value_type
	);
	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert all user attribute data into user_attribute_metadata table successfully.');

	INSERT INTO {{schema}}.event_metadata (id, month, prefix, project_id, app_id, day_number, count, event_name, platform)
	SELECT 
			project_id || '#' || app_info_app_id || '#' || event_name AS id,
			month,
			'EVENT#' || project_id || '#' || app_info_app_id AS prefix,
			project_id AS project_id,
			app_info_app_id AS app_id,
			day_number,
			count,
			event_name AS event_name,
			platform AS platform
	FROM ( 
			SELECT
					event_name,
					project_id,
					app_info.app_id::varchar AS app_info_app_id,
					'#' || TO_CHAR(TO_DATE(event_date, 'YYYY-MM-DD'), 'YYYYMM') AS month,
					EXTRACT(DAY FROM TO_DATE(event_date, 'YYYY-MM-DD')) AS day_number,
					LISTAGG(DISTINCT platform, '#') WITHIN GROUP (ORDER BY platform) AS platform,
					count(*) as count
			FROM {{schema}}.ods_events
			WHERE 
					ingest_timestamp >= EXTRACT(epoch FROM DATE_TRUNC('day', GETDATE() - INTERVAL '1 day' * day_range)::timestamp)*1000::bigint
					AND ingest_timestamp < EXTRACT(epoch FROM DATE_TRUNC('day', GETDATE())::timestamp)*1000::bigint
					AND event_name != '_' 
			GROUP BY event_name, project_id, app_info_app_id, month, day_number  
	);
	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert all event data into event_metadata table successfully.');	
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);	
END;
$$ LANGUAGE plpgsql;