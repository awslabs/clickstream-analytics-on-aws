CREATE OR REPLACE PROCEDURE {{schema}}.sp_scan_metadata(top_frequent_properties_limit NUMERIC, end_date DATE, start_date DATE) 
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
		event_date DATE,
    property_category VARCHAR(20),
    property_name VARCHAR(255),
    property_value VARCHAR(255),
    value_type VARCHAR(255),
    platform VARCHAR(255)	
  );

  CREATE TEMP TABLE IF NOT EXISTS user_attribute_temp_table (
		user_id VARCHAR(255),
		event_timestamp BIGINT,
    property_category VARCHAR(20),
    property_name VARCHAR(255),
    property_value VARCHAR(255),
    value_type VARCHAR(255)
  );	

	-- Table is for setting the column name of including properties into metadata
	CREATE TEMPORARY TABLE IF NOT EXISTS property_column_temp_table (column_name VARCHAR);

	INSERT INTO 
		property_column_temp_table (column_name) 
	VALUES 
		('platform'), 
		('project_id');

	-- Table is for setting the column and the properties that should be included into metadata
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
		('geo', 'latitude'), 
		('geo', 'longitude'), 
		('geo', 'accuracy'), 
		('traffic_source', 'medium'), 
		('traffic_source', 'name'), 
		('traffic_source', 'source');

	-- Table is for setting the column of including user attributes into metadata
	CREATE TEMPORARY TABLE IF NOT EXISTS user_column_temp_table (column_name VARCHAR);

	INSERT INTO 
		user_column_temp_table (column_name) 
	VALUES 
		('_first_visit_date'),
		('_first_referer'),
		('_first_traffic_source_type'),
		('_first_traffic_medium'),
		('_first_traffic_source'),
		('_channel');			

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'create temp tables successfully.');

	query := 'SELECT column_name FROM property_column_temp_table';
	FOR rec IN EXECUTE query LOOP
		IF start_date IS NULL THEN
			EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_info.app_id::varchar AS app_info_app_id, event_date, ''other'' AS property_category, ''' || quote_ident(rec.column_name) || ''' AS property_name, ' || quote_ident(rec.column_name) || '::varchar AS property_value, ''string'' AS value_type, platform FROM {{schema}}.event WHERE event_date < ''' || end_date || ''')';
		ELSE
			EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_info.app_id::varchar AS app_info_app_id, event_date, ''other'' AS property_category, ''' || quote_ident(rec.column_name) || ''' AS property_name, ' || quote_ident(rec.column_name) || '::varchar AS property_value, ''string'' AS value_type, platform FROM {{schema}}.event WHERE event_date >= ''' || start_date || ''' AND event_date < ''' || end_date || ''')';
		END IF;
	END LOOP;

	query := 'SELECT column_name, property_name FROM property_array_temp_table';
	FOR rec IN EXECUTE query LOOP
		IF start_date IS NULL THEN
			EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_info.app_id::varchar AS app_info_app_id, event_date, ''' || quote_ident(rec.column_name) || ''' AS property_category, ' || quote_literal(rec.property_name) || ' AS property_name, ' || quote_ident(rec.column_name) || '.' || quote_ident(rec.property_name) || '::varchar AS property_value, CASE WHEN ''' || quote_ident(rec.property_name) || '''::varchar IN (''screen_height'', ''screen_width'', ''viewport_height'', ''viewport_width'', ''time_zone_offset_seconds'') THEN ''int'' ELSE ''string'' END AS value_type, platform FROM {{schema}}.event WHERE event_date < ''' || end_date || ''')';
		ELSE
			EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_info.app_id::varchar AS app_info_app_id, event_date, ''' || quote_ident(rec.column_name) || ''' AS property_category, ' || quote_literal(rec.property_name) || ' AS property_name, ' || quote_ident(rec.column_name) || '.' || quote_ident(rec.property_name) || '::varchar AS property_value, CASE WHEN ''' || quote_ident(rec.property_name) || '''::varchar IN (''screen_height'', ''screen_width'', ''viewport_height'', ''viewport_width'', ''time_zone_offset_seconds'') THEN ''int'' ELSE ''string'' END AS value_type, platform FROM {{schema}}.event WHERE event_date >= ''' || start_date || ''' AND event_date < ''' || end_date || ''')';
		END IF;
	END LOOP;

	IF start_date IS NULL THEN
		INSERT INTO properties_temp_table (
			SELECT
				parameter.event_name,
				'{{database_name}}' AS project_id,
				'{{schema}}' AS app_info_app_id,
				event.event_date AS event_date,
				'event' AS property_category,
				parameter.event_param_key::varchar AS property_name,
			CASE
					WHEN event_param_double_value IS NOT NULL THEN CAST(event_param_double_value AS varchar)
					WHEN event_param_float_value  IS NOT NULL THEN CAST(event_param_float_value AS varchar)
					WHEN event_param_int_value    IS NOT NULL THEN CAST(event_param_int_value AS varchar)
					WHEN event_param_string_value IS NOT NULL THEN event_param_string_value
			END AS property_value,
				CASE
					WHEN event_param_double_value IS NOT NULL THEN 'double'
					WHEN event_param_float_value  IS NOT NULL THEN 'float'
					WHEN event_param_int_value    IS NOT NULL THEN 'int'
					WHEN event_param_string_value IS NOT NULL THEN 'string'
				END AS value_type,
				event.platform AS platform
			FROM 
				{{schema}}.event_parameter parameter
			JOIN 
				{{schema}}.event event
			ON 
				parameter.event_timestamp = event.event_timestamp 
				AND parameter.event_id = event.event_id 
			WHERE 
				property_name NOT LIKE '%timestamp%'
				AND event.event_date < end_date
		);	
	ELSE
		INSERT INTO properties_temp_table (
			SELECT
				parameter.event_name,
				'{{database_name}}' AS project_id,
				'{{schema}}' AS app_info_app_id,
				event.event_date AS event_date,
				'event' AS property_category,
				parameter.event_param_key::varchar AS property_name,
			CASE
					WHEN event_param_double_value IS NOT NULL THEN CAST(event_param_double_value AS varchar)
					WHEN event_param_float_value  IS NOT NULL THEN CAST(event_param_float_value AS varchar)
					WHEN event_param_int_value    IS NOT NULL THEN CAST(event_param_int_value AS varchar)
					WHEN event_param_string_value IS NOT NULL THEN event_param_string_value
			END AS property_value,
				CASE
					WHEN event_param_double_value IS NOT NULL THEN 'double'
					WHEN event_param_float_value  IS NOT NULL THEN 'float'
					WHEN event_param_int_value    IS NOT NULL THEN 'int'
					WHEN event_param_string_value IS NOT NULL THEN 'string'
				END AS value_type,
				event.platform AS platform
			FROM 
				{{schema}}.event_parameter parameter
			JOIN 
				{{schema}}.event event
			ON 
				parameter.event_timestamp = event.event_timestamp 
				AND parameter.event_id = event.event_id 
			WHERE 
				property_name NOT LIKE '%timestamp%'
				AND event.event_date >= start_date
				AND event.event_date < end_date
		);
	END IF;


	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert data into properties_temp_table table successfully.');

	INSERT INTO {{schema}}.event_properties_metadata (id, month, prefix, project_id, app_id, day_number, category, event_name, property_name, value_type, value_enum, platform) 
	SELECT
		project_id || '#' || app_info_app_id || '#' || event_name || '#' || property_category || '#' || property_name || '#' || value_type AS id,
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
						'#' || TO_CHAR(event_date::DATE, 'YYYYMM') AS month,
						TO_CHAR(event_date::DATE, 'DD')::INTEGER AS day_number,
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

	query := 'SELECT column_name FROM user_column_temp_table';
	FOR rec IN EXECUTE query LOOP
		EXECUTE 'INSERT INTO user_attribute_temp_table (SELECT user_id, event_timestamp, ''user_outer'' AS property_category, ''' || quote_ident(rec.column_name) || ''' AS property_name, ' || quote_ident(rec.column_name) || '::varchar AS property_value, ''String'' AS value_type FROM {{schema}}.user)';
	END LOOP;	

	INSERT INTO user_attribute_temp_table (
		SELECT
			user_id,
			event_timestamp,
			'user' AS property_category,
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
				WHEN user_properties.value.string_value::varchar IS NOT NULL THEN 'string'
				WHEN user_properties.value.int_value::varchar IS NOT NULL THEN 'int'
				WHEN user_properties.value.float_value::varchar IS NOT NULL THEN 'float'
				WHEN user_properties.value.double_value::varchar IS NOT NULL THEN 'double'
			ELSE 'None'
			END AS value_type
		FROM 
			{{schema}}.user u, u.user_properties AS user_properties
	);	

  -- user attribute
	INSERT INTO {{schema}}.user_attribute_metadata (id, month, prefix, project_id, app_id, day_number, category, property_name, value_type, value_enum) 
	SELECT
		project_id || '#' || app_info_app_id || '#' || property_category || '#' || property_name || '#' || value_type AS id,
		month,
		'USER_ATTRIBUTE#' || project_id || '#' || app_info_app_id AS prefix,
		project_id AS project_id,
		app_info_app_id AS app_id,
		day_number,
		property_category AS category,
		property_name AS property_name,
		value_type AS value_type,
		property_values AS value_enum
	FROM (
		SELECT 
			'{{database_name}}' AS project_id,
			'{{schema}}' AS app_info_app_id,
			'#' || TO_CHAR(CURRENT_DATE, 'YYYYMM') AS month,
			EXTRACT(DAY FROM CURRENT_DATE) AS day_number,
			property_category,
			property_name,
			value_type, 
			LISTAGG(property_value || '_' || parameter_count, '#') WITHIN GROUP (ORDER BY property_value) as property_values
		FROM (
			SELECT
				property_category,
				property_name,
				property_value,
				value_type,
				count(*) AS parameter_count
			FROM (
				SELECT
					*,
					ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_timestamp DESC) AS rank
				FROM
					user_attribute_temp_table
			)
			WHERE 
				property_name NOT LIKE '%timestamp%'
				AND rank = 1 
				AND property_value IS NOT NULL
				AND property_value != ''
			GROUP BY property_category, property_name, property_value, value_type
		)
		GROUP BY project_id, app_info_app_id, month, day_number, property_category, property_name, value_type
	);

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert all user attribute data into user_attribute_metadata table successfully.');

	IF start_date IS NULL THEN
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
						'#' || TO_CHAR(event_date::DATE, 'YYYYMM') AS month,
						TO_CHAR(event_date::DATE, 'DD')::INTEGER AS day_number,
						LISTAGG(DISTINCT platform, '#') WITHIN GROUP (ORDER BY platform) AS platform,
						count(*) as count
				FROM {{schema}}.event
				WHERE 
						event_date < end_date
						AND event_name != '_' 
				GROUP BY event_name, project_id, app_info_app_id, month, day_number  
		);
	ELSE
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
						'#' || TO_CHAR(event_date::DATE, 'YYYYMM') AS month,
						TO_CHAR(event_date::DATE, 'DD')::INTEGER AS day_number,
						LISTAGG(DISTINCT platform, '#') WITHIN GROUP (ORDER BY platform) AS platform,
						count(*) as count
				FROM {{schema}}.event
				WHERE 
						event_date >= start_date
						AND event_date < end_date
						AND event_name != '_' 
				GROUP BY event_name, project_id, app_info_app_id, month, day_number  
		);
	END IF;
	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert all event data into event_metadata table successfully.');	
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);	
END;
$$ LANGUAGE plpgsql;