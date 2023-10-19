select 
   event_date
  ,event_name
  ,event_id
  ,event_bundle_sequence_id::bigint as event_bundle_sequence_id
  ,event_previous_timestamp::bigint as event_previous_timestamp
  ,event_timestamp
  ,event_value_in_usd
  ,app_info.app_id::varchar as app_info_app_id
  ,app_info.id::varchar as app_info_package_id
  ,app_info.install_source::varchar as app_info_install_source
  ,app_info.version::varchar as app_info_version
  ,device.vendor_id::varchar as device_id
  ,device.mobile_brand_name::varchar as device_mobile_brand_name
  ,device.mobile_model_name::varchar as device_mobile_model_name
  ,device.manufacturer::varchar as device_manufacturer
  ,device.screen_width::bigint as device_screen_width
  ,device.screen_height::bigint as device_screen_height
  ,device.carrier::varchar as device_carrier
  ,device.network_type::varchar as device_network_type
  ,device.operating_system::varchar as device_operating_system
  ,device.operating_system_version::varchar as device_operating_system_version
  ,device.ua_browser::varchar 
  ,device.ua_browser_version::varchar
  ,device.ua_os::varchar
  ,device.ua_os_version::varchar
  ,device.ua_device::varchar
  ,device.ua_device_category::varchar
  ,device.system_language::varchar as device_system_language
  ,device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds
  ,geo.continent::varchar as geo_continent
  ,geo.country::varchar as geo_country
  ,geo.city::varchar as geo_city
  ,geo.metro::varchar as geo_metro
  ,geo.region::varchar as geo_region
  ,geo.sub_continent::varchar as geo_sub_continent
  ,geo.locale::varchar as geo_locale
  ,platform
  ,project_id
  ,traffic_source.name::varchar as traffic_source_name
  ,traffic_source.medium::varchar as traffic_source_medium
  ,traffic_source.source::varchar as traffic_source_source
  ,event.user_id
  ,event.user_pseudo_id
  ,u.user_first_touch_timestamp
from {{database}}.{{eventTable}} as event
left join (
	select
	  *
	from (
    select  
      user_pseudo_id,
		  user_first_touch_timestamp
	    ,ROW_NUMBER() over (partition by user_pseudo_id ORDER BY event_timestamp desc) AS et_rank
	  from {{schema}}.{{userTable}}
  )
	where et_rank = 1
) as u on event.user_pseudo_id = u.user_pseudo_id
where event.partition_app = ? 
  and event.partition_year >= ?
  and event.partition_month >= ?
  and event.partition_day >= ?