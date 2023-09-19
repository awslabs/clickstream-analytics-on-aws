CREATE OR REPLACE PROCEDURE {{schema}}.sp_scan_metadata(top_frequent_properties_limit NUMERIC, day_range NUMERIC)
AS $$ 
DECLARE
  rec RECORD;
  query text;
	log_name varchar(50) := 'sp_scan_metadata';
BEGIN

	-- Drop event_properties_metadata and event_metadata table, the data should be moved into DDB
	DROP TABLE IF EXISTS {{schema}}.event_properties_metadata;
	DROP TABLE IF EXISTS {{schema}}.event_metadata;

  CREATE TABLE IF NOT EXISTS {{schema}}.event_properties_metadata (
    id VARCHAR(255),
    type VARCHAR(255),
    prefix VARCHAR(255),
    event_name VARCHAR(255),
    project_id VARCHAR(255),
    app_id VARCHAR(255),
    category VARCHAR(255),
		metadata_source VARCHAR(255),
		property_type VARCHAR(255),
    property_name VARCHAR(255),
		property_id VARCHAR(255),
    value_type VARCHAR(255),
    value_enum VARCHAR(MAX),
    platform VARCHAR(255)
  );

  CREATE TABLE IF NOT EXISTS {{schema}}.event_metadata (
    id VARCHAR(255),
    type VARCHAR(255),
    prefix VARCHAR(255),
    project_id VARCHAR(255),
    app_id VARCHAR(255),
    event_name VARCHAR(255),
		metadata_source VARCHAR(255),
		data_volumel_last_day VARCHAR(255),
    platform VARCHAR(255)
  );    	

  CREATE TEMP TABLE IF NOT EXISTS properties_temp_table (
    event_name VARCHAR(255),
    project_id VARCHAR(255),
    app_info_app_id VARCHAR(255),
    property_category VARCHAR(20),
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
		EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_info.app_id::varchar AS app_info_app_id, ''other'' AS property_category, ''' || quote_ident(rec.column_name) || ''' AS property_name, ' || quote_ident(rec.column_name) || '::varchar AS property_values, ''String'' AS value_type, platform FROM {{schema}}.ods_events WHERE ingest_timestamp >= EXTRACT(epoch FROM DATE_TRUNC(''day'', GETDATE() - INTERVAL ''' || quote_ident(day_range) || ' day'')::timestamp)*1000::bigint AND ingest_timestamp < EXTRACT(epoch FROM DATE_TRUNC(''day'', GETDATE())::timestamp)*1000::bigint)';
	END LOOP;

	query := 'SELECT column_name, property_name FROM property_array_temp_table';
	FOR rec IN EXECUTE query LOOP
		EXECUTE 'INSERT INTO properties_temp_table (SELECT event_name, project_id, app_info.app_id::varchar AS app_info_app_id, ''' || quote_ident(rec.column_name) || ''' AS property_category, ' || quote_literal(rec.property_name) || ' AS property_name, ' || quote_ident(rec.column_name) || '.' || quote_ident(rec.property_name) || '::varchar AS property_values, CASE WHEN ''' || quote_ident(rec.property_name) || '''::varchar IN (''screen_height'', ''screen_width'', ''viewport_height'', ''viewport_width'', ''time_zone_offset_seconds'') THEN ''Integer'' ELSE ''String'' END AS value_type, platform FROM {{schema}}.ods_events WHERE ingest_timestamp >= EXTRACT(epoch FROM DATE_TRUNC(''day'', GETDATE() - INTERVAL ''' || quote_ident(day_range) || ' day'')::timestamp)*1000::bigint AND ingest_timestamp < EXTRACT(epoch FROM DATE_TRUNC(''day'', GETDATE())::timestamp)*1000::bigint)';
	END LOOP;

	INSERT INTO properties_temp_table (
		SELECT
			event_name,
			project_id,
			app_info.app_id::varchar AS app_info_app_id,
			'event' AS property_category,
			event_params.key::varchar AS property_name,
			coalesce 
				(nullif(event_params.value.string_value::varchar,'')
			  	, nullif(event_params.value.int_value::varchar,'')
			  	, nullif(event_params.value.float_value::varchar,'')
			  	, nullif(event_params.value.double_value::varchar,'')) AS property_values,
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

	INSERT INTO {{schema}}.event_properties_metadata (id, type, prefix, event_name, project_id, app_id, category, metadata_source, property_type, property_name, property_id, value_type, value_enum, platform) 
	SELECT
			project_id || '#' || app_info_app_id || '#' || event_name || '#' || property_name AS id,
	  	'EVENT#' || project_id || '#' || app_info_app_id || '#' || event_name AS type,
	  	'EVENT_PARAMETER#' || project_id || '#' || app_info_app_id AS prefix,    
	  	event_name AS event_name,
	  	project_id AS project_id,
	  	app_info_app_id AS app_id,
	  	property_category AS category,
			CASE 
				WHEN LEFT(property_name, 1) = '_' THEN 'Preset'
				ELSE 'Custom'
			END AS metadata_source,
			CASE 
				WHEN LEFT(property_name, 1) = '_' THEN 'Public'
				ELSE 'Private'
			END AS property_type,
	  	property_name AS property_name,
			event_name || '#' || property_name AS property_id,
	  	value_type AS value_type,
	  	property_values AS value_enum,
			platform AS platform
	FROM (
		SELECT 
			event_name, 
			project_id, 
			app_info_app_id, 
			property_category, 
			property_name, 
			value_type, 
			platform,
			'[' || LISTAGG(property_value, ', ') WITHIN GROUP (ORDER BY property_value) || ']' AS property_values
		FROM (
      SELECT 
        event_name, 
        project_id, 
        app_info_app_id, 
        property_category, 
        property_name, 
        value_type,
        property_value,
          '[' || LISTAGG(platform, ', ') WITHIN GROUP (ORDER BY platform) || ']' AS platform
      FROM (
        SELECT 
          event_name, 
          project_id, 
          app_info_app_id, 
          property_category, 
          property_name, 
          property_value, 
          value_type, 
          platform, 
          parameter_count
        FROM (
          SELECT 
            event_name, 
            project_id, 
            app_info_app_id, 
            property_category, 
            property_name, 
            property_value, 
            value_type, 
            platform, 
            parameter_count,
              ROW_NUMBER() OVER (PARTITION BY event_name, project_id, app_info_app_id, property_category, property_name ORDER BY parameter_count DESC) AS row_num
          FROM (
            SELECT 
              event_name, 
              project_id, 
              app_info_app_id, 
              property_category, 
              property_name, 
              property_value, 
              platform, 
              value_type, 
              count(*) AS parameter_count 
            FROM properties_temp_table
            GROUP BY event_name, project_id, app_info_app_id, property_category, property_name, property_value, value_type, platform
          )
        )
        WHERE 
          row_num <= top_frequent_properties_limit OR
          (event_name = '_page_view' AND property_name IN ('_page_title', '_page_url')) OR
          (event_name = '_screen_view' and property_name IN ('_screen_name', '_screen_id'))
        ORDER BY event_name, project_id, app_info_app_id      
			)
			GROUP By event_name, project_id, app_info_app_id, property_category, property_name, value_type, property_value
		)
		GROUP By event_name, project_id, app_info_app_id, property_category, property_name, value_type, platform
	);

	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert all parameters data into event_properties_metadata table successfully.');	

  -- user attribute
	INSERT INTO {{schema}}.event_properties_metadata (id, type, prefix, event_name, project_id, app_id, category, metadata_source, property_type, property_name, property_id, value_type, value_enum, platform) 
	SELECT
		project_id || '#' || app_info_app_id || '#' || event_name || '#' || property_name AS id,
		'USER_ATTRIBUTE#' || project_id || '#' || app_info_app_id || '#' || property_name AS type,
		'USER_PARAMETER#' || project_id || '#' || app_info_app_id AS prefix,
		event_name AS event_name,
		project_id AS project_id,
		app_info_app_id AS app_id,
		'user' AS category,
		CASE 
			WHEN LEFT(property_name, 1) = '_' THEN 'Preset'
			ELSE 'Custom'
		END AS metadata_source,	
		CASE 
			WHEN LEFT(property_name, 1) = '_' THEN 'Public'
			ELSE 'Private'
		END AS property_type,
		property_name AS property_name,
		event_name || '#' || property_name AS property_id,
		value_type AS value_type,
		property_values AS value_enum,
		platform AS platform
	FROM (
		SELECT 
			event_name, 
			project_id, 
			app_info_app_id, 
			property_name, 
			value_type, 
			platform,
			'[' || LISTAGG(property_value, ', ') WITHIN GROUP (ORDER BY property_value) || ']' AS property_values
	  	FROM (
	  		SELECT 
	  			event_name, 
	  			project_id, 
	  			app_info_app_id, 
	  			property_name, 
	  			value_type,
	  			property_value,
	      		'[' || LISTAGG(platform, ', ') WITHIN GROUP (ORDER BY platform) || ']' AS platform
	  		FROM (
          SELECT 
            event_name, 
            project_id, 
            app_info_app_id, 
            property_name, 
            property_value, 
            value_type, 
            platform, 
            parameter_count
          FROM (
            SELECT 
              event_name, 
              project_id, 
              app_info_app_id, 
              property_name, 
              property_value, 
              value_type, 
              platform, 
              parameter_count,
                ROW_NUMBER() OVER (PARTITION BY event_name, project_id ORDER BY parameter_count DESC) AS row_num
            FROM (
              SELECT 
                event_name, 
                project_id, 
                app_info_app_id, 
                property_name, 
                property_value, 
                platform, 
                value_type, 
                count(*) AS parameter_count 
              FROM (
                SELECT
                  event_name,
                  project_id,
                  app_info.app_id::varchar AS app_info_app_id,
                  user_properties.key::varchar AS property_name,
                  coalesce 
                  (
                    nullif(user_properties.value.string_value::varchar,'')
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
                  platform
                FROM {{schema}}.ods_events e, e.user_properties AS user_properties
                WHERE 
                  property_name NOT LIKE '%timestamp%'
                  AND ingest_timestamp >= EXTRACT(epoch FROM DATE_TRUNC('day', GETDATE() - INTERVAL '1 day' * day_range)::timestamp)*1000::bigint
                  AND ingest_timestamp < EXTRACT(epoch FROM DATE_TRUNC('day', GETDATE())::timestamp)*1000::bigint  							            
              )
              GROUP BY event_name, project_id, app_info_app_id, property_name, property_value, value_type, platform
            )
          )
          WHERE row_num <= top_frequent_properties_limit
          ORDER BY event_name, project_id, app_info_app_id
	  		)
	  		GROUP By event_name, project_id, app_info_app_id, property_name, value_type, property_value
	  	)
	  	GROUP By event_name, project_id, app_info_app_id, property_name, value_type, platform
	);
	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert all user attribute data into event_properties_metadata table successfully.');

	INSERT INTO {{schema}}.event_metadata (id, type, prefix, project_id, app_id, event_name, metadata_source, data_volumel_last_day, platform)
	SELECT 
		project_id || '#' || app_info_app_id || '#' || event_name AS id,
		'EVENT#' || project_id || '#' || app_info_app_id || '#' || event_name AS type,
		'EVENT#' || project_id || '#' || app_info_app_id AS prefix,
		project_id AS project_id,
		app_info_app_id AS app_id,
		event_name AS event_name,
		CASE 
			WHEN LEFT(event_name, 1) = '_' THEN 'Preset'
			ELSE 'Custom'
		END AS metadata_source,	
		data_volumel_last_day AS data_volumel_last_day,
		platform AS platform
	FROM (   
		SELECT 
		  event_name,
		  project_id,
		  app_info_app_id,
			data_volumel_last_day,
		  '[' || LISTAGG(platform, ', ') WITHIN GROUP (ORDER BY platform) || ']' AS platform
		FROM (
			SELECT
				event_name,
				project_id,
				app_info.app_id::varchar AS app_info_app_id,
				platform,
				count(*) AS data_volumel_last_day
			FROM {{schema}}.ods_events
			WHERE 
				ingest_timestamp >= EXTRACT(epoch FROM DATE_TRUNC('day', GETDATE() - INTERVAL '1 day' * day_range)::timestamp)*1000::bigint
				AND ingest_timestamp < EXTRACT(epoch FROM DATE_TRUNC('day', GETDATE())::timestamp)*1000::bigint
				AND event_name != '_'
			GROUP BY event_name, project_id, app_info_app_id, platform
		)
		GROUP BY event_name, project_id, app_info_app_id, data_volumel_last_day
	);
	CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'info', 'Insert all event data into event_metadata table successfully.');	
EXCEPTION WHEN OTHERS THEN
    CALL {{schema}}.{{sp_clickstream_log}}(log_name, 'error', 'error message:' || SQLERRM);	
END;
$$ LANGUAGE plpgsql;