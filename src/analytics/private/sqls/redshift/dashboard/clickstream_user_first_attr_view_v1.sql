CREATE MATERIALIZED VIEW {{schema}}.{{viewName}}
BACKUP YES
SORTKEY(user_pseudo_id) 
AUTO REFRESH YES 
AS
SELECT
    user_pseudo_id,
    app_info.install_source::VARCHAR AS first_visit_install_source,
    device.system_language::VARCHAR AS first_visit_device_language,
    platform AS first_platform,
    geo.country::VARCHAR AS first_visit_country,
    geo.city::VARCHAR AS first_visit_city
  FROM
    {{schema}}.event
  WHERE
    event_name IN ('_first_open', '_first_visit')
;