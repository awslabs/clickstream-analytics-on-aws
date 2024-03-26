CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user_sp(day date) 
LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

  DELETE FROM {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user where event_date = day;

  -- first_traffic_source
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'first_traffic_source' as aggregation_type,
    first_traffic_source as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_traffic_source/medium
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'first_traffic_source-first_traffic_medium' as aggregation_type,
    first_traffic_source || '-' || first_traffic_medium as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_traffic_medium
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'first_traffic_medium' as aggregation_type,
    first_traffic_medium as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_traffic_campaign
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'first_traffic_campaign' as aggregation_type,
    first_traffic_campaign as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_traffic_clid_platform
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'first_traffic_clid_platform' as aggregation_type,
    first_traffic_clid_platform as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_traffic_channel_group,
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'first_traffic_channel_group' as aggregation_type,
    first_traffic_channel_group as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_app_install_source
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'first_app_install_source' as aggregation_type,
    first_app_install_source as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- session_source
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'session_source' as aggregation_type,
    session_source as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  group by 1,2,3,4,5
  ;

  -- session_medium
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'session_medium' as aggregation_type,
    session_medium as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  group by 1,2,3,4,5
  ;

  -- session_source/medium
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'session_source - session_medium' as aggregation_type,
    session_source || '-' || session_medium as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  group by 1,2,3,4,5
  ;

  -- session_campaign
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'session_campaign' as aggregation_type,
    session_campaign as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  group by 1,2,3,4,5
  ;
  -- session_clid_platform
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'session_clid_platform' as aggregation_type,
    session_clid_platform as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  group by 1,2,3,4,5
  ;
  -- session_channel_group
  INSERT INTO {{database_name}}.{{schema}}.clickstream_acquisition_day_traffic_source_user (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    event_date,
    platform,
    'session_channel_group' as aggregation_type,
    session_channel_group as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where event_date = day
  group by 1,2,3,4,5
  ;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log_non_atomic('clickstream_acquisition_day_traffic_source_user', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;
$$;