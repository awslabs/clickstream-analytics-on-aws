CREATE OR REPLACE VIEW {{schema}}.{{viewName}}
AS
select 
event_date
, event_name
, event_id
, event_bundle_sequence_id
, event_previous_timestamp
, event.event_timestamp
, event_value_in_usd
, app_info_app_id
, app_info_package_id
, app_info_install_source
, app_info_version
, app_info_sdk_name
, app_info_sdk_version
, device_id
, device_mobile_brand_name
, device_mobile_model_name
, device_manufacturer
, device_screen_width
, device_screen_height
, device_carrier
, device_network_type
, device_operating_system
, device_operating_system_version
, host_name
, ua_browser
, ua_browser_version
, ua_os
, ua_os_version
, ua_device
, ua_device_category
, device_system_language
, device_time_zone_offset_seconds
, geo_continent
, geo_country
, geo_city
, geo_metro
, geo_region
, geo_sub_continent
, geo_locale
, platform
, project_id
, traffic_source_name
, traffic_source_medium
, traffic_source_source
, event.user_id
, event.user_pseudo_id
, u.user_first_touch_timestamp
from shop.tttttt as event
left join shop.user_m_view as u on event.user_pseudo_id = u.user_pseudo_id