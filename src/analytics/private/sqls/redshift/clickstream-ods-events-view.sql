CREATE MATERIALIZED VIEW {{schema}}.clickstream_ods_events_view 
BACKUP NO
SORTKEY(event_date)
AUTO REFRESH YES
AS
select 
event_date
, event_name as event_name
, event_id as event_id
, event_bundle_sequence_id::bigint as event_bundle_sequence_id
, event_previous_timestamp::bigint as event_previous_timestamp
, event_server_timestamp_offset::bigint as event_server_timestamp_offset
, event_timestamp as event_timestamp
, ingest_timestamp as ingest_timestamp
, event_value_in_usd as event_value_in_usd
, app_info.app_id::varchar as app_info_app_id
, app_info.id::varchar as app_info_package_id
, app_info.install_source::varchar as app_info_install_source
, app_info.version::varchar as app_info_version
, device.mobile_brand_name::varchar as device_mobile_brand_name
, device.mobile_model_name::varchar as device_mobile_model_name
, device.manufacturer::varchar as device_manufacturer
, device.screen_width::bigint as device_screen_width
, device.screen_height::bigint as device_screen_height
, device.carrier::varchar as device_carrier
, device.network_type::varchar as device_network_type
, device.operating_system::varchar as device_operating_system
, device.operating_system_version::varchar as device_operating_system_version
, device.ua_browser::varchar 
, device.ua_browser_version::varchar
, device.ua_os::varchar
, device.ua_os_version::varchar
, device.ua_device::varchar
, device.ua_device_category::varchar
, device.system_language::varchar as device_system_language
, device.time_zone_offset_seconds::bigint as device_time_zone_offset_seconds
, geo.continent::varchar as geo_continent
, geo.country::varchar as geo_country
, geo.city::varchar as geo_city
, geo.metro::varchar as geo_metro
, geo.region::varchar as geo_region
, geo.sub_continent::varchar as geo_sub_continent
, geo.locale::varchar as geo_locale
, privacy_info.ads_storage::varchar as privacy_info_ad_storage
, privacy_info.analytics_storage::varchar as privacy_info_analytics_storage
, privacy_info.uses_transient_token::varchar as privacy_info_uses_transient_token
, platform as platform
, project_id as project_id
, traffic_source.name::varchar as traffic_source_name
, traffic_source.medium::varchar as traffic_source_medium
, traffic_source.source::varchar as traffic_source_source
, user_first_touch_timestamp as user_first_touch_timestamp
, user_id as user_id
, user_pseudo_id
from {{schema}}.ods_events;