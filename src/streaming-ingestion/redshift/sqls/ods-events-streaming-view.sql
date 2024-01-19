CREATE OR REPLACE VIEW {{app_schema}}.ods_events_streaming_view as
select approximate_arrival_timestamp
, event_data.project_id::VARCHAR as project_id
, event_data.event_name::VARCHAR as event_name
, event_data.event_id::VARCHAR as event_id
, event_data.app_id::VARCHAR as app_id
, event_data.user_pseudo_id::VARCHAR as user_pseudo_id
, event_data.event_timestamp::BIGINT as event_timestamp
, event_data.device::SUPER as device
, event_data.app_info::SUPER as app_info
, event_data.ecommerce::SUPER as ecommerce
, event_data.event_bundle_sequence_id::BIGINT as event_bundle_sequence_id
, event_data.event_date::DATE as event_date
, event_data.event_dimensions::SUPER as event_dimensions
, event_data.event_params::SUPER as event_params
, event_data.event_previous_timestamp::BIGINT as event_previous_timestamp
, event_data.event_server_timestamp_offset::BIGINT as event_server_timestamp_offset
, event_data.event_value_in_usd::INT as event_value_in_usd
, event_data.geo::SUPER as geo
, event_data.ingest_timestamp::BIGINT as ingest_timestamp
, event_data.items::SUPER as items
, event_data.platform::VARCHAR as platform
, event_data.privacy_info::SUPER as privacy_info
, event_data.traffic_source::SUPER as traffic_source
, event_data.user_first_touch_timestamp::BIGINT as user_first_touch_timestamp
, event_data.user_id::VARCHAR as user_id
, event_data.user_ltv::SUPER as user_ltv
, event_data.user_properties::SUPER as user_properties
from {{app_schema}}.ods_events_streaming_mv;