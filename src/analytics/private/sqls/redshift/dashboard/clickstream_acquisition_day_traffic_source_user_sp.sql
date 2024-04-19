CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}}(day date, timezone varchar) 
LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

  DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = day;

  -- first_traffic_source
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Traffic Source' as aggregation_type,
    first_traffic_source as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_traffic_source / medium
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Traffic Source / Medium' as aggregation_type,
    first_traffic_source || ' / ' || first_traffic_medium as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_traffic_medium
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Traffic Medium' as aggregation_type,
    first_traffic_medium as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_traffic_campaign
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Traffic Campaign' as aggregation_type,
    first_traffic_campaign as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_traffic_clid_platform
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Traffic Clid Platform' as aggregation_type,
    first_traffic_clid_platform as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_traffic_channel_group,
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Traffic Channel Group' as aggregation_type,
    first_traffic_channel_group as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- first_app_install_source
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'App Install Source' as aggregation_type,
    first_app_install_source as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  and event_name = '_first_open'
  group by 1,2,3,4,5
  ;

  -- session_source
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Session Source' as aggregation_type,
    session_source as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  group by 1,2,3,4,5
  ;

  -- session_medium
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Session Medium' as aggregation_type,
    session_medium as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  group by 1,2,3,4,5
  ;

  -- session_source / medium
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Session Source / Medium' as aggregation_type,
    session_source || ' / ' || session_medium as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  group by 1,2,3,4,5
  ;

  -- session_campaign
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Session Campaign' as aggregation_type,
    session_campaign as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  group by 1,2,3,4,5
  ;
  -- session_clid_platform
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Session Clid Platform' as aggregation_type,
    session_clid_platform as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  group by 1,2,3,4,5
  ;
  -- session_channel_group
  INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
    event_date, 
    platform, 
    aggregation_type,
    aggregation_dim, 
    user_id
  )
  select 
    day::date as event_date,
    platform,
    'Session Channel Group' as aggregation_type,
    session_channel_group as aggregation_dim,
    merged_user_id as user_id
  from {{database_name}}.{{schema}}.{{baseView}}
  where DATE_TRUNC('day', CONVERT_TIMEZONE(timezone, event_timestamp)) = day
  group by 1,2,3,4,5
  ;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;
$$;