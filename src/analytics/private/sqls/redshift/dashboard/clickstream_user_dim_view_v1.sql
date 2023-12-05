CREATE OR REPLACE VIEW {{schema}}.{{viewName}}
AS
WITH user_base AS (
  SELECT
    user_pseudo_id,
    user_id,
    _first_visit_date AS first_visit_date,
    _first_referer AS first_referer,
    CASE
      WHEN NULLIF(_first_traffic_source, '') IS NULL THEN '(Direct)'
      ELSE _first_traffic_source
    END AS first_traffic_source_source,
    _first_traffic_medium AS first_traffic_source_medium,
    _first_traffic_source_type AS first_traffic_source_name,
    CASE
      WHEN user_id IS NOT NULL THEN 'Registered'
      ELSE 'Non-registered'
    END AS registration_status
  FROM
    {{schema}}.user_m_view
), device_id AS (
  SELECT
    user_pseudo_id,
    LISTAGG(d_id, ' | ') WITHIN GROUP (ORDER BY user_pseudo_id) AS device_id
  FROM (
    SELECT
      user_pseudo_id,
      d_id::VARCHAR
    FROM
      {{schema}}.user_m_view u, u.device_id_list d_id
  )
  GROUP BY
    user_pseudo_id
)
SELECT
  u.*,
  f.first_visit_install_source,
  f.first_visit_device_language,
  f.first_platform,
  f.first_visit_country,
  f.first_visit_city,
  d.device_id
FROM
  user_base u
LEFT JOIN
  {{schema}}.clickstream_user_first_attr_view_v1 f ON u.user_pseudo_id = f.user_pseudo_id
LEFT JOIN
  device_id d ON u.user_pseudo_id = d.user_pseudo_id
;