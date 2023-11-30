-- run following command to load latest partition
-- msck repair table {{database}}.{{eventTable}};

with base as (
  select 
    *
  from {{database}}.{{eventTable}}
  where partition_app = ? 
    and partition_year >= ?
    and partition_month >= ?
    and partition_day >= ?
),
clickstream_user_dim_mv_1 as (
  SELECT
      user_pseudo_id
    , event_date as first_visit_date
    , app_info.install_source as first_visit_install_source
    , device.system_language as first_visit_device_language
    , platform as first_platform
    , geo.country as first_visit_country
    , geo.city as first_visit_city
    , (case when nullif(traffic_source.source,'') is null then '(direct)' else traffic_source.source end) as first_traffic_source_source
    , traffic_source.medium as first_traffic_source_medium
    , traffic_source.name as first_traffic_source_name
  from base
  where event_name in ('_first_open','_first_visit')
),

clickstream_user_dim_mv_2 AS (
  select user_pseudo_id,
    count
    (
        distinct user_id
    ) as user_id_count
  from base ods
  where event_name not in 
    (
        '_first_open',
        '_first_visit'
    ) group by 1
)

SELECT upid.*,
  (
    case when uid.user_id_count>0 then 'Registered' else 'Non-registered' end
  ) as is_registered
from clickstream_user_dim_mv_1 as upid left outer join 
clickstream_user_dim_mv_2 as uid on upid.user_pseudo_id=uid.user_pseudo_id