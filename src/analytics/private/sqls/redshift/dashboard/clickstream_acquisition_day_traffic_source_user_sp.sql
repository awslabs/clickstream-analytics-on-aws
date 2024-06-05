CREATE OR REPLACE PROCEDURE {{database_name}}.{{schema}}.{{spName}}(day date, timezone varchar, ndays integer) 
LANGUAGE plpgsql
AS $$ 
DECLARE 
  current_date date;
  i integer = 0;
BEGIN
  current_date := day;
  WHILE i < ndays LOOP
    DELETE FROM {{database_name}}.{{schema}}.{{viewName}} where event_date = current_date;

    -- first_traffic_source
    INSERT INTO {{database_name}}.{{schema}}.{{viewName}} (
      event_date, 
      platform, 
      aggregation_type,
      aggregation_dim, 
      user_id
    )
    select 
      current_date::date as event_date,
      platform,
      'User First Traffic Source' as aggregation_type,
      first_traffic_source as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'User First Traffic Source / Medium' as aggregation_type,
      first_traffic_source || ' / ' || first_traffic_medium as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'User First Traffic Medium' as aggregation_type,
      first_traffic_medium as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'User First Traffic Campaign' as aggregation_type,
      first_traffic_campaign as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'User First Traffic Clid Platform' as aggregation_type,
      first_traffic_clid_platform as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'User First Traffic Channel Group' as aggregation_type,
      first_traffic_channel_group as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'App First Install Source' as aggregation_type,
      first_app_install_source as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'Session Traffic Source' as aggregation_type,
      session_source as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'Session Traffic Medium' as aggregation_type,
      session_medium as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'Session Traffic Source / Medium' as aggregation_type,
      session_source || ' / ' || session_medium as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'Session Traffic Campaign' as aggregation_type,
      session_campaign as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'Session Traffic Clid Platform' as aggregation_type,
      session_clid_platform as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
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
      current_date::date as event_date,
      platform,
      'Session Traffic Channel Group' as aggregation_type,
      session_channel_group as aggregation_dim,
      merged_user_id as user_id
    from {{database_name}}.{{schema}}.{{baseView}}
    where event_timestamp >= current_date::timestamp AT TIME ZONE timezone AND event_timestamp < (current_date + 1)::timestamp AT TIME ZONE timezone
    group by 1,2,3,4,5
    ;

    current_date := current_date - 1;
    i := i + 1;
  END LOOP;

EXCEPTION WHEN OTHERS THEN
    call {{database_name}}.{{schema}}.sp_clickstream_log('{{viewName}}', 'error', 'error message:' || SQLERRM);
    RAISE INFO 'error message: %', SQLERRM;
END;
$$;