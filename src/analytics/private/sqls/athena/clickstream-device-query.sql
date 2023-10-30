select
   device.vendor_id as device_id
  ,event_date 
  ,device.mobile_brand_name
  ,device.mobile_model_name
  ,device.manufacturer
  ,device.screen_width
  ,device.screen_height
  ,device.carrier
  ,device.network_type
  ,device.operating_system
  ,device.operating_system_version
  ,device.ua_browser
  ,device.ua_browser_version
  ,device.ua_os
  ,device.ua_os_version
  ,device.ua_device
  ,device.ua_device_category
  ,device.system_language
  ,device.time_zone_offset_seconds
  ,device.advertising_id
  ,device.host_name
  ,user_pseudo_id
  ,user_id
  ,count(event_id) as usage_num
from {{database}}.{{eventTable}} 
where partition_app = ? 
  and partition_year >= ?
  and partition_month >= ?
  and partition_day >= ?
group by
  device.vendor_id
  ,event_date
  ,device.mobile_brand_name
  ,device.mobile_model_name
  ,device.manufacturer
  ,device.screen_width
  ,device.screen_height
  ,device.carrier
  ,device.network_type
  ,device.operating_system
  ,device.operating_system_version
  ,device.ua_browser
  ,device.ua_browser_version
  ,device.ua_os 
  ,device.ua_os_version
  ,device.ua_device
  ,device.ua_device_category
  ,device.system_language
  ,device.time_zone_offset_seconds
  ,device.advertising_id
  ,device.host_name
  ,user_pseudo_id
  ,user_id