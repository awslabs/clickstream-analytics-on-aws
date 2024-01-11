CREATE VIEW {{schema}}.{{viewName}}
AS
WITH 
session_part_1 AS (
  SELECT 
    es.session_id::VARCHAR,
    user_pseudo_id,
    platform,
    MAX(session_duration) AS session_duration,
    (CASE WHEN (MAX(session_duration) >= 10000 OR SUM(view) >= 1) THEN 1 ELSE 0 END) AS engaged_session,
    (CASE WHEN (MAX(session_duration) >= 10000 OR SUM(view) >= 1) THEN 0 ELSE 1 END) AS bounced_session,
    MIN(session_st) AS session_start_timestamp,
    SUM(view) AS session_views,
    SUM(engagement_time) AS session_engagement_time
  FROM {{schema}}.clickstream_session_duration_attr_view_v1 AS es
  GROUP BY 1,2,3
),
session_page_data AS (
    SELECT 
      session_id::VARCHAR as session_id,
      view,
      ROW_NUMBER() OVER(PARTITION BY session_id ORDER BY event_timestamp ASC) AS rank
    FROM {{schema}}.clickstream_session_page_attr_view_v1
),
min_max_data as (
  select 
    session_id,
    min(rank) min_rank,
    max(rank) max_rank
  from session_page_data
  group by session_id
),
session_part_2 as (
  select 
    session_page_data.session_id,
    max(case when rank = min_rank then view else null end) first_sv_view,
    max(case when rank = max_rank then view else null end) last_sv_view
  from session_page_data join min_max_data on session_page_data.session_id = min_max_data.session_id 
  and (session_page_data.rank = min_max_data.max_rank or session_page_data.rank = min_max_data.min_rank)
  group by session_page_data.session_id
)
SELECT 
  CASE
    WHEN session.session_id IS NULL THEN CAST('#' AS VARCHAR)
    WHEN session.session_id = '' THEN CAST('#' AS VARCHAR)
    ELSE session.session_id 
  END AS session_id,
  user_pseudo_id,
  platform,
  session_duration::BIGINT,
  session_views::BIGINT,
  engaged_session::BIGINT,
  bounced_session,
  session_start_timestamp,
  CASE
    WHEN session.session_engagement_time IS NULL THEN CAST(0 AS BIGINT)
    ELSE session.session_engagement_time 
  END::BIGINT AS session_engagement_time,
  DATE_TRUNC('day', TIMESTAMP 'epoch' + session_start_timestamp/1000 * INTERVAL '1 second') AS session_date,
  DATE_TRUNC('hour', TIMESTAMP 'epoch' + session_start_timestamp/1000 * INTERVAL '1 second') AS session_date_hour,
  first_sv_view::VARCHAR AS entry_view,
  last_sv_view::VARCHAR AS exit_view
FROM session_part_1 session
LEFT OUTER JOIN session_part_2 ON session.session_id = session_part_2.session_id
;