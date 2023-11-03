CREATE MATERIALIZED VIEW {{schema}}.{{sessionViewName}}
BACKUP NO
SORTKEY(session_date)
AUTO REFRESH YES
AS
WITH base_data AS (
  SELECT 
    event.event_id,
    event.event_name,
    event.event_date,
    event.platform,
    event.user_id,
    event.user_pseudo_id,
    event.event_timestamp,
    event_parameter.event_param_key,
    event_parameter.event_param_double_value,
    event_parameter.event_param_float_value,
    event_parameter.event_param_int_value,
    event_parameter.event_param_string_value
  FROM {{schema}}.event
  JOIN {{schema}}.event_parameter ON event.event_timestamp = event_parameter.event_timestamp AND event.event_id = event_parameter.event_id
),

session_part_1 AS (
  SELECT 
    es.session_id::VARCHAR,
    user_pseudo_id,
    platform,
    MAX(session_duration) AS session_duration,
    (CASE WHEN (MAX(session_duration) > 10000 OR SUM(view) > 1) THEN 1 ELSE 0 END) AS engaged_session,
    (CASE WHEN (MAX(session_duration) > 10000 OR SUM(view) > 1) THEN 0 ELSE 1 END) AS bounced_session,
    MIN(session_st) AS session_start_timestamp,
    SUM(view) AS session_views,
    SUM(engagement_time) AS session_engagement_time
  FROM
  (
    SELECT 
      user_pseudo_id,
      event_id,
      platform,
      MAX(CASE WHEN event_param_key = '_session_id' THEN event_param_string_value ELSE NULL END) AS session_id,
      MAX(CASE WHEN event_param_key = '_session_duration' THEN event_param_int_value ELSE NULL END) AS session_duration,
      MAX(CASE WHEN event_param_key = '_session_start_timestamp' THEN event_param_int_value ELSE NULL END) AS session_st,
      MAX(CASE WHEN event_param_key = '_engagement_time_msec' THEN event_param_int_value ELSE NULL END) AS engagement_time,
      (CASE WHEN MAX(event_name) IN ('_screen_view', '_page_view') THEN 1 ELSE 0 END) AS view
    FROM base_data
    GROUP BY 1,2,3
  ) AS es
  GROUP BY 1,2,3
),

session_part_2 AS (
  SELECT session_id, first_sv_event_id, last_sv_event_id, COUNT(event_id) FROM (
    SELECT 
      session_id::VARCHAR,
      event_id,
      FIRST_VALUE(event_id) OVER(PARTITION BY session_id ORDER BY event_timestamp ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS first_sv_event_id,
      LAST_VALUE(event_id) OVER(PARTITION BY session_id ORDER BY event_timestamp ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_sv_event_id
    FROM (
      SELECT 
        event_name,
        event_id,
        event_timestamp,
        MAX(CASE WHEN event_param_key = '_session_id' THEN event_param_string_value ELSE NULL END) AS session_id
      FROM base_data WHERE event_name IN ('_screen_view','_page_view')
      GROUP BY 1,2,3
    ) 
  )
  GROUP BY 1,2,3
),

tmp_data AS (
  SELECT event_id, MAX(
    CASE 
      WHEN (event_param_key = '_screen_name' OR event_param_key = '_page_title') THEN event_param_string_value 
      ELSE NULL 
    END) AS view
  FROM base_data
  GROUP BY 1
),

session_f_sv_view AS (
  SELECT session_f_l_sv.*, t.view AS first_sv_view
  FROM session_part_2 AS session_f_l_sv 
  LEFT OUTER JOIN tmp_data t ON session_f_l_sv.first_sv_event_id = t.event_id
), 

session_f_l_sv_view AS (
  SELECT session_f_sv_view.*, t.view AS last_sv_view
  FROM session_f_sv_view 
  LEFT OUTER JOIN tmp_data t ON session_f_sv_view.last_sv_event_id = t.event_id
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
FROM session_part_1 AS session 
LEFT OUTER JOIN session_f_l_sv_view ON session.session_id = session_f_l_sv_view.session_id
;