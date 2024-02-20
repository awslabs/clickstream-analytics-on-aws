-- run following command to load latest partition
-- msck repair table {{database}}.{{eventTable}};
-- msck repair table {{database}}.{{userTable}};

select 
   event_date
  ,event_name
  ,event_id
  ,event_bundle_sequence_id as event_bundle_sequence_id
  ,event_previous_timestamp as event_previous_timestamp
  ,event_timestamp
  ,event_value_in_usd
  ,app_info.app_id as app_info_app_id
  ,app_info.id as app_info_package_id
  ,app_info.install_source as app_info_install_source
  ,app_info.version as app_info_version
  ,device.vendor_id as device_id
  ,device.mobile_brand_name as device_mobile_brand_name
  ,device.mobile_model_name as device_mobile_model_name
  ,device.manufacturer as device_manufacturer
  ,device.screen_width as device_screen_width
  ,device.screen_height as device_screen_height
  ,device.carrier as device_carrier
  ,device.network_type as device_network_type
  ,device.operating_system as device_operating_system
  ,device.operating_system_version as device_operating_system_version
  ,device.ua_browser 
  ,device.ua_browser_version
  ,device.ua_os
  ,device.ua_os_version
  ,device.ua_device
  ,device.ua_device_category
  ,device.system_language as device_system_language
  ,device.time_zone_offset_seconds as device_time_zone_offset_seconds
  ,geo.continent as geo_continent
  ,geo.country as geo_country
  ,geo.city as geo_city
  ,geo.metro as geo_metro
  ,geo.region as geo_region
  ,geo.sub_continent as geo_sub_continent
  ,geo.locale as geo_locale
  ,platform
  ,project_id
  ,traffic_source.name as traffic_source_name
  ,traffic_source.medium as traffic_source_medium
  ,traffic_source.source as traffic_source_source
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
	  from {{database}}.{{userTable}}
  )
	where et_rank = 1
) as u on event.user_pseudo_id = u.user_pseudo_id
where event.partition_app = ? 
  and event.partition_year >= ?
  and event.partition_month >= ?
  and event.partition_day >= ?