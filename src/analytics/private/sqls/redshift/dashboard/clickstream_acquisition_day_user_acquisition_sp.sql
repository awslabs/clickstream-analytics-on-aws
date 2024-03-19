CREATE OR REPLACE PROCEDURE {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition_sp(day date) 
 LANGUAGE plpgsql
AS $$ 
DECLARE 

BEGIN

DELETE FROM {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition where event_date = day;

drop table if exists event_traffic_tmp_tb;
create temp table event_traffic_tmp_tb as (
    SELECT 
        session_id,
        COUNT(DISTINCT event_id) AS event_cnt,
        SUM(CASE WHEN event_name = '_page_view' OR event_name = '_screen_view' THEN 1 ELSE 0 END) AS session_views,
        MAX(session_duration) AS session_duration,
        SUM(user_engagement_time_msec) AS user_engagement_time_msec,
        CASE WHEN
           SUM(CASE WHEN event_name = '_page_view' OR event_name = '_screen_view' THEN 1 ELSE 0 END) > 1 
         OR MAX(session_duration) > 10000  THEN 1 ELSE 0 
        END AS session_indicator,
        MAX(CASE WHEN event_name = '_first_open' THEN 1 ELSE 0 END) AS new_user_indicator
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE
        event_date = day
    GROUP BY 
        session_id
);

-- first_traffic_source
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_source) AS first_traffic_source
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'first_traffic_source' as aggregation_type,
    tmp2.first_traffic_source as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;

-- first_traffic_source/medium
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_source) AS first_traffic_source,
        MAX(first_traffic_medium) AS first_traffic_medium
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'first_traffic_source-first_traffic_medium' as aggregation_type,
    tmp2.first_traffic_source || '-' || tmp2.first_traffic_medium as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;

-- first_traffic_medium
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_medium) AS first_traffic_medium
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'first_traffic_medium' as aggregation_type,
    tmp2.first_traffic_medium as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;

-- first_traffic_campaign
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_campaign) AS first_traffic_campaign
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'first_traffic_campaign' as aggregation_type,
    tmp2.first_traffic_campaign as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;


-- first_traffic_clid_platform
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_clid_platform) AS first_traffic_clid_platform
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'first_traffic_clid_platform' as aggregation_type,
    tmp2.first_traffic_clid_platform as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;


-- first_traffic_channel_group,
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_traffic_channel_group) AS first_traffic_channel_group
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'first_traffic_channel_group' as aggregation_type,
    tmp2.first_traffic_channel_group as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;


-- first_app_install_source
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(first_app_install_source) AS first_app_install_source
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'first_app_install_source' as aggregation_type,
    tmp2.first_app_install_source as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;


-- session_source,
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_source) AS session_source
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'session_source' as aggregation_type,
    tmp2.session_source as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;

-- session_medium,
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_medium) AS session_medium
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'session_medium' as aggregation_type,
    tmp2.session_medium as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;

-- session_source/medium,
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_source) AS session_source,
        MAX(session_medium) AS session_medium
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'session_source' as aggregation_type,
    tmp2.session_source || '-' || tmp2.session_medium as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;


-- session_campaign,
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_campaign) AS session_campaign
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'session_campaign' as aggregation_type,
    tmp2.session_campaign as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;

-- session_clid_platform,
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_clid_platform) AS session_clid_platform
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'session_clid_platform' as aggregation_type,
    tmp2.session_clid_platform as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;

-- session_channel_group
INSERT INTO {{dbName}}.{{schema}}.clickstream_acquisition_day_user_acquisition (
    event_date,
    aggregation_type,
    aggregation_dim,
    platform, 
    new_user_cnt,
    session_cnt,
    engagement_session_cnt,
    engagement_rate,
    avg_user_engagement_time_msec,
    event_cnt
)
with tmp2 AS (
    SELECT 
        session_id,
        platform,
        MAX(session_channel_group) AS session_channel_group
    FROM 
        {{dbName}}.{{schema}}.{{baseView}}
    WHERE 
        event_date = day
    GROUP BY 
        1, 2
)
SELECT 
    day::date AS event_date,
    'session_channel_group' as aggregation_type,
    tmp2.session_channel_group as aggregation_dim,
    tmp2.platform,
    SUM(tmp1.new_user_indicator) AS new_user_cnt,
    COUNT(tmp1.session_id) AS session_cnt,
    SUM(tmp1.session_indicator) AS engagement_session_cnt,
    SUM(tmp1.session_indicator) / SUM(tmp1.event_cnt) AS engagement_rate,
    SUM(user_engagement_time_msec) / COUNT(tmp1.session_id) AS avg_user_engagement_time_msec,
    SUM(tmp1.event_cnt) AS event_cnt
FROM 
    tmp2
JOIN 
    event_traffic_tmp_tb tmp1 ON tmp2.session_id = tmp1.session_id
GROUP BY 
    1, 2, 3, 4;


DROP TABLE IF EXISTS event_traffic_tmp_tb;

EXCEPTION WHEN OTHERS THEN
    RAISE INFO 'error message: %', SQLERRM;
END;      
$$;