CREATE MATERIALIZED VIEW {{schema}}.clickstream_user_dim_mv_1 
BACKUP NO
SORTKEY(first_visit_date)
AUTO REFRESH YES
AS
SELECT
user_pseudo_id
, user_id
, event_date as first_visit_date
, app_info.install_source::varchar as first_visit_install_source
, device.system_language::varchar as first_visit_device_language
, platform as first_platform
, geo.country::varchar as first_visit_country
, geo.city::varchar as first_visit_city
, (case when nullif(traffic_source.source::varchar,'') is null then '(direct)' else traffic_source.source::varchar end) as first_traffic_source_source
, traffic_source.medium::varchar as first_traffic_source_medium
, traffic_source.name::varchar as first_traffic_source_name
from {{schema}}.ods_events
where event_name in ('_first_open','_first_visit');

-- recompute refresh
CREATE MATERIALIZED VIEW {{schema}}.clickstream_user_dim_mv_2 
BACKUP NO
SORTKEY(user_pseudo_id)
AUTO REFRESH YES
AS
select user_pseudo_id,
    count
    (
        distinct user_id
    ) as user_id_count
    from {{schema}}.ods_events ods
    where event_name not in 
    (
        '_first_open',
        '_first_visit'
    ) group by 1
;

CREATE OR REPLACE VIEW {{schema}}.clickstream_user_dim_view 
AS
SELECT upid.*,
(
    case when uid.user_id_count>0 then 'Registered' else 'Non-registered' end
) as is_registered
from {{schema}}.clickstream_user_dim_mv_1 as upid left outer join 
{{schema}}.clickstream_user_dim_mv_2 as uid on upid.user_pseudo_id=uid.user_pseudo_id;