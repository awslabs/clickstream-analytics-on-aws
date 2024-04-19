CREATE OR REPLACE FUNCTION {{schema}}.convert_json_list(json_in varchar(65535))
RETURNS varchar(65535)
/*
	This function is used to convert a json to a json list
	Example: 
	Input: {"key1": {"value": "value2", "type": "string"}, "key2": {"value": "1", "type": "int"}}
	Output: [{"key": "key1", "value": "value2", "type": "string"}, {"key": "key2", "value": "1", "type": "int"}]
*/
STABLE
AS $$
import json

results = []
data = json.loads(json_in)
for key, value_dict in data.items():
	if 'value' in value_dict:
		value = value_dict['value']
		type = value_dict['type']
		results.append({'key': key, 'value': value, 'type': type})
return json.dumps(results)
$$ LANGUAGE plpythonu;

CREATE OR REPLACE PROCEDURE {{schema}}.sp_scan_metadata(top_frequent_properties_limit NUMERIC, end_timestamp TIMESTAMP, start_timestamp TIMESTAMP) 
AS 
$$ 
DECLARE
  rec RECORD;
  query text;
	log_name varchar(50) := 'sp_scan_metadata';
BEGIN

	-- Drop event_parameter_metadata and event_metadata table, the data should be moved into DDB
	DROP TABLE IF EXISTS {{schema}}.event_parameter_metadata;
	DROP TABLE IF EXISTS {{schema}}.event_metadata;
	DROP TABLE IF EXISTS {{schema}}.user_attribute_metadata;

  CREATE TABLE IF NOT EXISTS {{schema}}.event_parameter_metadata (
    id VARCHAR(255),
		month VARCHAR(255),
    prefix VARCHAR(255),
		project_id VARCHAR(255),
		app_id VARCHAR(255),
		day_number BIGINT,
		category VARCHAR(255),
		event_name_set VARCHAR(MAX),
		property_name VARCHAR(255),
    value_type VARCHAR(255),
    property_value VARCHAR(512),
		count BIGINT,
		platform VARCHAR(4096)
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
		platform VARCHAR(4096),
		sdk_version VARCHAR(255),
		sdk_name VARCHAR(255)
  );    	

  CREATE TEMP TABLE IF NOT EXISTS properties_temp_table (
    event_name VARCHAR(255),
    project_id VARCHAR(255),
    app_id VARCHAR(255),
		event_timestamp TIMESTAMP,
    property_category VARCHAR(20),
    property_name VARCHAR(255),
    property_value VARCHAR(512),
    value_type VARCHAR(255),
    platform VARCHAR(255)	
  );

  CREATE TEMP TABLE IF NOT EXISTS user_attribute_temp_table (
    property_category VARCHAR(20),
    property_name VARCHAR(255),
    property_value VARCHAR(512),
    value_type VARCHAR(255)
  );

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'create temp tables successfully.');

	query := 'SELECT category, property_name, value_type FROM {{schema}}.property_array_temp_table where property_type = ''event_property'' and value_type != ''boolean''';
	FOR rec IN EXECUTE query LOOP
		IF start_timestamp IS NULL THEN
			EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_id, event_timestamp, '|| quote_literal(rec.category) || ' AS property_category, ' || quote_literal(rec.property_name) || ' AS property_name, LEFT(' || quote_ident(rec.property_name) || '::varchar, 100) AS property_value, '|| quote_literal(rec.value_type) || ' AS value_type, platform FROM {{schema}}.event_v2 WHERE LEFT(' || quote_ident(rec.property_name) || '::varchar, 100) IS NOT NULL AND event_timestamp < ''' || end_timestamp || ''')';
		ELSE
			EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_id, event_timestamp, '|| quote_literal(rec.category) || ' AS property_category, ' || quote_literal(rec.property_name) || ' AS property_name, LEFT(' || quote_ident(rec.property_name) || '::varchar, 100) AS property_value, '|| quote_literal(rec.value_type) || ' AS value_type, platform FROM {{schema}}.event_v2 WHERE LEFT(' || quote_ident(rec.property_name) || '::varchar, 100) IS NOT NULL AND event_timestamp >= ''' || start_timestamp || ''' AND event_timestamp < ''' || end_timestamp || ''')';
		END IF;
	END LOOP;

	query := 'SELECT category, property_name, value_type FROM {{schema}}.property_array_temp_table where property_type = ''event_property'' and value_type = ''boolean''';
	FOR rec IN EXECUTE query LOOP
			IF start_timestamp IS NULL THEN
					EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_id, event_timestamp, ' || quote_literal(rec.category) || ' AS property_category, ' || quote_literal(rec.property_name) || ' AS property_name, CASE ' || quote_ident(rec.property_name) || ' WHEN TRUE THEN ''true'' ELSE ''false'' END AS property_value, ' || quote_literal(rec.value_type) || ' AS value_type, platform FROM {{schema}}.event_v2 WHERE ' || quote_ident(rec.property_name) || ' IS NOT NULL AND event_timestamp < ''' || end_timestamp || ''')';
			ELSE
					EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_id, event_timestamp, ' || quote_literal(rec.category) || ' AS property_category, ' || quote_literal(rec.property_name) || ' AS property_name, CASE ' || quote_ident(rec.property_name) || ' WHEN TRUE THEN ''true'' ELSE ''false'' END AS property_value, ' || quote_literal(rec.value_type) || ' AS value_type, platform FROM {{schema}}.event_v2 WHERE ' || quote_ident(rec.property_name) || ' IS NOT NULL AND event_timestamp >= ''' || start_timestamp || ''' AND event_timestamp < ''' || end_timestamp || ''')';
			END IF;
	END LOOP;
	-- query custom event parameters
	IF start_timestamp IS NULL THEN
		INSERT INTO properties_temp_table (	
			SELECT
				event_name,
				project_id,
				app_id,
				event_timestamp,
				property_category,
				cp.key::VARCHAR AS property_name,
				cp.value::VARCHAR AS property_value,
				cp.type::VARCHAR AS value_type,
				platform
			FROM (
				SELECT
					event_name,
					project_id,
					app_id,
					event_timestamp,
					'event' AS property_category,
					platform,
					json_parse({{schema}}.convert_json_list(json_serialize(custom_parameters))) AS custom_parameters_array
				FROM
					{{schema}}.event_v2
				WHERE
					custom_parameters IS NOT NULL
					AND event_timestamp < end_timestamp
			) AS ep,
			ep.custom_parameters_array AS cp
		);
	ELSE
		INSERT INTO properties_temp_table (	
			SELECT
				event_name,
				project_id,
				app_id,
				event_timestamp,
				property_category,
				cp.key::VARCHAR AS property_name,
				cp.value::VARCHAR AS property_value,
				cp.type::VARCHAR AS value_type,
				platform
			FROM (
				SELECT
					event_name,
					project_id,
					app_id,
					event_timestamp,
					'event' AS property_category,
					platform,
					json_parse({{schema}}.convert_json_list(json_serialize(custom_parameters))) AS custom_parameters_array
				FROM
					{{schema}}.event_v2
				WHERE
					custom_parameters IS NOT NULL
					AND event_timestamp >= start_timestamp
					AND event_timestamp < end_timestamp
			) AS ep,
			ep.custom_parameters_array AS cp
		);
	END IF;

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert data into properties_temp_table table successfully.');

	INSERT INTO {{schema}}.event_parameter_metadata (id, month, prefix, project_id, app_id, day_number, category, event_name_set, property_name, value_type, property_value, count, platform) 
	SELECT
		project_id || '#' || app_id || '#' ||  property_category || '#' || property_name || '#' || value_type AS id,
		month,
		'EVENT_PARAMETER#' || project_id || '#' || app_id AS prefix,    
		project_id,
		app_id,
		day_number,
		property_category AS category,
		event_name_set,
		property_name,
		value_type,
		property_value,
		parameter_count as count,
		platform
	FROM (
		SELECT
			project_id, 
			app_id, 
			property_category,
			month, 
			day_number, 
			property_name, 
			property_value, 
			value_type, 
			SUM(parameter_count) AS parameter_count,
			LISTAGG(DISTINCT platform, '#|!|#') WITHIN GROUP (ORDER BY platform) AS platform,
			LISTAGG(DISTINCT event_name, '#|!|#') WITHIN GROUP (ORDER BY platform) AS event_name_set
		FROM (
			SELECT
				project_id, 
				app_id,
				property_category, 
				month, 
				day_number, 
				property_name, 
				property_value, 
				value_type, 
				parameter_count,
				event_name,
				platform
			FROM (						
				SELECT 
					project_id, 
					app_id, 
					property_category, 
					month,
					day_number,
					value_type,
					property_name,
					property_value,
					event_name,
					platform,
					parameter_count,
					ROW_NUMBER() OVER (PARTITION BY project_id, app_id, property_category, month, day_number, value_type, property_name ORDER BY parameter_count DESC) AS row_num
				FROM (
					SELECT
						event_name, 
						project_id, 
						app_id,
						property_category, 
						'#' || TO_CHAR(event_timestamp::DATE, 'YYYYMM') AS month,
						TO_CHAR(event_timestamp::DATE, 'DD')::INTEGER AS day_number,
						property_name,
						property_value, 
						value_type, 
						platform,
						count(*) AS parameter_count
					FROM
						properties_temp_table
					WHERE 
						property_value IS NOT NULL AND
						property_value != ''
					GROUP BY project_id, app_id, property_category, month, day_number, value_type, property_name, property_value, platform, event_name								
				)
			)
			WHERE row_num <= top_frequent_properties_limit OR
				(property_name IN ('page_view_page_title', 'page_view_page_url', 'screen_view_screen_name', 'screen_view_screen_id') AND row_num <= 50)
		)
		GROUP BY project_id, app_id, property_category, month, day_number, value_type, property_name, property_value
	);

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert all parameters data into event_parameter_metadata table successfully.');	

	query := 'SELECT category, property_name, value_type FROM {{schema}}.property_array_temp_table where property_type = ''user_property''';
	FOR rec IN EXECUTE query LOOP
		EXECUTE 'INSERT INTO user_attribute_temp_table (SELECT '|| quote_literal(rec.category) || ' AS property_category, ' || quote_literal(rec.property_name) || ' AS property_name, LEFT(' || quote_ident(rec.property_name) || '::varchar, 100) AS property_value, '|| quote_literal(rec.value_type) || ' AS value_type FROM {{schema}}.user_m_view_v2)';
	END LOOP;	

	INSERT INTO user_attribute_temp_table (
		SELECT
			property_category,
			up.key::VARCHAR as property_name,
			up.value::VARCHAR as property_value,
			up.type::VARCHAR as value_type
		FROM (
			SELECT
				'user' AS property_category,
				json_parse({{schema}}.convert_json_list(json_serialize(user_properties))) AS user_properties_array
			FROM
				{{schema}}.user_m_view_v2
			WHERE
				user_properties IS NOT NULL	
		) as u,
		u.user_properties_array AS up
	);	

  -- user attribute
	INSERT INTO {{schema}}.user_attribute_metadata (id, month, prefix, project_id, app_id, day_number, category, property_name, value_type, value_enum) 
	SELECT
		project_id || '#' || app_id || '#' || property_category || '#' || property_name || '#' || value_type AS id,
		month,
		'USER_ATTRIBUTE#' || project_id || '#' || app_id AS prefix,
		project_id AS project_id,
		app_id,
		day_number,
		property_category AS category,
		property_name AS property_name,
		value_type AS value_type,
		property_values AS value_enum
	FROM (
		SELECT 
			'{{database_name}}' AS project_id,
			'{{schema}}' AS app_id,
			'#' || TO_CHAR(CURRENT_DATE, 'YYYYMM') AS month,
			EXTRACT(DAY FROM CURRENT_DATE) AS day_number,
			property_category,
			property_name,
			value_type, 
			LISTAGG(property_value || '_' || parameter_count, '#|!|#') WITHIN GROUP (ORDER BY property_value) as property_values
		FROM (
			SELECT
				property_category,
				property_name,
				property_value,
				value_type,
				parameter_count
			FROM (
				SELECT
					property_category,
					property_name,
					property_value,
					value_type,
					parameter_count,
					ROW_NUMBER() OVER (PARTITION BY property_category, property_name, value_type ORDER BY parameter_count DESC) AS row_num
				FROM (
					SELECT
						property_category,
						property_name,
						property_value,
						value_type,
						count(*) AS parameter_count
					FROM
						user_attribute_temp_table
					WHERE 
						property_name NOT LIKE '%timestamp%'
						AND property_value IS NOT NULL
						AND property_value != ''
					GROUP BY property_category, property_name, property_value, value_type
				)
			)
			WHERE row_num <= top_frequent_properties_limit
		)
		GROUP BY project_id, app_id, month, day_number, property_category, property_name, value_type
	);

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert all user attribute data into user_attribute_metadata table successfully.');

	IF start_timestamp IS NULL THEN
		INSERT INTO {{schema}}.event_metadata (id, month, prefix, project_id, app_id, day_number, count, event_name, platform, sdk_version, sdk_name)
		SELECT 
				project_id || '#' || app_id || '#' || event_name AS id,
				month,
				'EVENT#' || project_id || '#' || app_id AS prefix,
				project_id AS project_id,
				app_id,
				day_number,
				count,
				event_name AS event_name,
				platform AS platform,
				sdk_version AS sdk_version,
				sdk_name AS sdk_name
		FROM (
			SELECT
					event_name,
					project_id,
					app_id,
					month,
					day_number,
					LISTAGG(DISTINCT platform, '#|!|#') WITHIN GROUP (ORDER BY platform) AS platform,
					LISTAGG(DISTINCT sdk_version, '#|!|#') WITHIN GROUP (ORDER BY platform) AS sdk_version,
					LISTAGG(DISTINCT sdk_name, '#|!|#') WITHIN GROUP (ORDER BY platform) AS sdk_name,
					count(*) as count
			FROM (
				SELECT
					event_name,
					project_id,
					app_id,
					'#' || TO_CHAR(event_timestamp::DATE, 'YYYYMM') AS month,
					TO_CHAR(event_timestamp::DATE, 'DD')::INTEGER AS day_number,
					platform,
					sdk_version,
					sdk_name
				FROM
					{{schema}}.event_v2
				WHERE 
						event_timestamp < end_timestamp
						AND event_name != '_' 
			)
			GROUP BY event_name, project_id, app_id, month, day_number  
		);
	ELSE
		INSERT INTO {{schema}}.event_metadata (id, month, prefix, project_id, app_id, day_number, count, event_name, platform, sdk_version, sdk_name)
		SELECT 
				project_id || '#' || app_id || '#' || event_name AS id,
				month,
				'EVENT#' || project_id || '#' || app_id AS prefix,
				project_id AS project_id,
				app_id,
				day_number,
				count,
				event_name AS event_name,
				platform AS platform,
				sdk_version AS sdk_version,
				sdk_name AS sdk_name
		FROM (
			SELECT
					event_name,
					project_id,
					app_id,
					month,
					day_number,
					LISTAGG(DISTINCT platform, '#|!|#') WITHIN GROUP (ORDER BY platform) AS platform,
					LISTAGG(DISTINCT sdk_version, '#|!|#') WITHIN GROUP (ORDER BY platform) AS sdk_version,
					LISTAGG(DISTINCT sdk_name, '#|!|#') WITHIN GROUP (ORDER BY platform) AS sdk_name,
					count(*) as count
			FROM (
				SELECT
					event_name,
					project_id,
					app_id,
					'#' || TO_CHAR(event_timestamp::DATE, 'YYYYMM') AS month,
					TO_CHAR(event_timestamp::DATE, 'DD')::INTEGER AS day_number,
					platform,
					sdk_version,
					sdk_name
				FROM
					{{schema}}.event_v2
				WHERE 
						event_timestamp >= start_timestamp
						AND event_timestamp < end_timestamp
						AND event_name != '_' 						
			)
			GROUP BY event_name, project_id, app_id, month, day_number  
		);
	END IF;
	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert all event data into event_metadata table successfully.');	
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);	
END;
$$ LANGUAGE plpgsql;