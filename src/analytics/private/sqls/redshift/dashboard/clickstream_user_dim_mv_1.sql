CREATE MATERIALIZED VIEW {{schema}}.clickstream_user_dim_mv_1 
BACKUP NO
SORTKEY(first_visit_date)
AUTO REFRESH YES
AS
SELECT
  user_pseudo_id
, event_date as first_visit_date
, app_info.install_source::varchar as first_visit_install_source
, device.system_language::varchar as first_visit_device_language
, platform as first_platform
, geo.country::varchar as first_visit_country
, geo.city::varchar as first_visit_city
, (case when nullif(traffic_source.source::varchar,'') is null then '(direct)' else traffic_source.source::varchar end) as first_traffic_source_source
, traffic_source.medium::varchar as first_traffic_source_medium
, traffic_source.name::varchar as first_traffic_source_name
from {{schema}}.event
where event_name in ('_first_open','_first_visit');