# Activity report
You can use the Activity report to get insights into the activities the users performed when using your websites and apps. This report measures user activity by the events that users triggered, and let you view the detail attributes of the events.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Activity`**.

## Where the data comes from
Activity report are created based on the following QuickSight datasets:

- `Clickstream_Events` that connects to the `clickstream-ods-events` view in analytics engines (i.e., Redshift or Athena)
- `Clickstream_Event_Attributes` that connects to the `clickstream-event-parameter` view in analytics engines  

Below is the SQL command that generates the related veiws.
??? SQL Commands
    === "Redshift"
        ```sql
           -- clickstream-ods-events view
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
                , platform as platform
                , project_id as project_id
                , traffic_source.name::varchar as traffic_source_name
                , traffic_source.medium::varchar as traffic_source_medium
                , traffic_source.source::varchar as traffic_source_source
                , user_first_touch_timestamp as user_first_touch_timestamp
                , user_id as user_id
                , user_pseudo_id
                from {{schema}}.ods_events;

        
           -- event parameter view
            SELECT 
                e.event_id,
                e.event_name,
                e.event_date,
                ep.key::varchar as event_parameter_key,
                coalesce (ep.value.string_value
                    , ep.value.int_value
                    , ep.value.float_value
                    , ep.value.double_value)::varchar as event_parameter_value
            FROM {{schema}}.ods_events e, e.event_params as ep

        ```
    === "Athena"
        ```sql
        -- clickstream-ods-events query
        select 
            event_date
            ,event_name as event_name
            ,event_id as event_id
            ,event_bundle_sequence_id as event_bundle_sequence_id
            ,event_previous_timestamp as event_previous_timestamp
            ,event_server_timestamp_offset as event_server_timestamp_offset
            ,event_timestamp as event_timestamp
            ,ingest_timestamp as ingest_timestamp
            ,event_value_in_usd as event_value_in_usd
            ,app_info.app_id as app_info_app_id
            ,app_info.id as app_info_package_id
            ,app_info.install_source as app_info_install_source
            ,app_info.version as app_info_version
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
            ,platform as platform
            ,project_id as project_id
            ,traffic_source.name as traffic_source_name
            ,traffic_source.medium as traffic_source_medium
            ,traffic_source.source as traffic_source_source
            ,user_first_touch_timestamp as user_first_touch_timestamp
            ,user_id as user_id
            ,user_pseudo_id
            from {{database}}.{{eventTable}}
            where partition_app = ? 
            and partition_year >= ?
            and partition_month >= ?
            and partition_day >= ?

         -- clickstream-ods-event-parameter query
            select 
            event_id,
            event_name,
            event_date,
            params.key as event_parameter_key,
            coalesce (nullif(params.value.string_value, '')
            ,nullif(cast(params.value.int_value as varchar), '')
            ,nullif(cast(params.value.float_value as varchar),'')
            ,nullif(cast(params.value.double_value as varchar),'')) as event_parameter_value
            from {{database}}.{{eventTable}} cross join unnest(event_params) as t(params)
            where partition_app = ? 
            and partition_year >= ?
            and partition_month >= ?
            and partition_day >= ?


        ```

## Dimensions and metrics
The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`event_id`| Dimension | A SDK-generated unique id for the event user triggered when useing your websites and apps | Query from analytics engine|
|`event_name`| Dimension |The name of the event  | Query from analytics engine|
|`platform`| Dimension | The platform user used during the session  | Query from analytics engine|
|`Event User Type`| Dimension | The type of user performed the event, i.e., new user or existing user  | Calculated field in QuickSight|
|`event_date`| Metric | The date when the event was logged (YYYYMMDD format in UTC).  | Query from analytics engine|
|`event_timestamp`| Dimension | The time (in microseconds, UTC) when the event was logged on the client. | Query from analytics engine|
|`app_info_version`| Dimension | The version of the app or website when event was logged  | Query from analytics engine|
|`event_parameter_key`| Dimension | The key of the event parameter  | Query from analytics engine|
|`event_parameter_key`| Dimension | The value of the event parameter  | Query from analytics engine|
|`User activity number in last 7 days`| Metrics | Number of events logged in last 7 days  | Calculated field in QuickSight|
|`User activity number in last 30 days`| Metrics | Number of events logged in last 30 days  | Calculated field in QuickSight|


