# Device report
You can use the Device report to get insights into the devices that users useed when using your apps or websites. The report provides more information for your user profile.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Device`**.

## Where the data comes from
Device report are created based on the following QuickSight dataset:

- `Clickstream_Device`, which connects to the `clickstream-device` view in analytics engines (i.e., Redshift or Athena). 

Below is the SQL command that generates the view.
??? SQL Commands
    === "Redshift"
        ```sql
        -- clickstream-device view
        select
        device.vendor_id::varchar as device_id
        , to_date(event_date,'YYYYMMDD') as event_date 
        , device.mobile_brand_name::varchar
        , device.mobile_model_name::varchar
        , device.manufacturer::varchar
        , device.screen_width::int
        , device.screen_height::int
        , device.carrier::varchar
        , device.network_type::varchar
        , device.operating_system::varchar
        , device.operating_system_version::varchar
        , device.ua_browser::varchar
        , device.ua_browser_version::varchar
        , device.ua_os::varchar
        , device.ua_os_version::varchar
        , device.ua_device::varchar
        , device.ua_device_category::varchar
        , device.system_language::varchar
        , device.time_zone_offset_seconds::int
        , device.advertising_id::varchar
        , user_pseudo_id
        , user_id
        , count(event_id) as usage_num
        --pleaes update the following schema name with your schema name
        from {{app_id}}.ods_events 
        group by
        device_id
        , event_date
        , device.mobile_brand_name
        , device.mobile_model_name
        , device.manufacturer
        , device.screen_width
        , device.screen_height
        , device.carrier
        , device.network_type
        , device.operating_system
        , device.operating_system_version
        , device.ua_browser
        , device.ua_browser_version
        , device.ua_os 
        , device.ua_os_version
        , device.ua_device
        , device.ua_device_category
        , device.system_language
        , device.time_zone_offset_seconds
        , device.advertising_id
        , user_pseudo_id
        , user_id;
        ```
    === "Athena"
        ```sql
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
            ,user_pseudo_id
            ,user_id

        ```

## Dimensions and metrics
The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`device_id`| Dimension | The unique ID for the device, please refer to [SDK Manual](../sdk-manual/index.md) for how the device id was obtained| QuickSight aggregation|
|`user_pseudo_id`| Dimension | A SDK-generated unique id for the user | Query from analytics engine|
|`user_id`| Dimension | The user ID set via the setUserId API in SDK  | Query from analytics engine|
|`event_date`| Dimension | The event data of when the device information was logged | Query from analytics engine|
|`mobile_brand_name`| Dimension | The brand name for the device  | Query from analytics engine|
|`mobile_model_name`| Dimension | The model name for the device | Query from analytics engine|
|`manufacturer`| Dimension | The manufacturer for the device | Query from analytics engine|
|`network_type`| Dimension | The newtork type when user logged the events  | Query from analytics engine|
|`operating_system`| Dimension | The operating system of the device  | Query from analytics engine|
|`operating_system_version`| Dimension | The operating system version of the device  | Query from analytics engine|
|`screen_height`| Dimension | The screen height of the device  | Query from analytics engine|
|`screen_width`| Dimension | The screen width of the device  | Query from analytics engine|
|`Screen Resolution`| Dimension | The screen resolution (i.e., screen height x screen width) of the device  | Calculated field in QuickSight|
|`system_language`| Dimension | The system language of the solution  | Query from analytics engine|
|`us_broswer`| Dimension | The browser derived from user agent  | Query from analytics engine|
|`us_broswer_version`| Dimension | The browser version derived from user agent  | Query from analytics engine|
|`us_os`| Dimension | The operating system derived from user agent  | Query from analytics engine|
|`us_device`| Dimension | The device derived from user agent  | Query from analytics engine|
|`us_device_category`| Dimension | The device category derived from user agent  | Query from analytics engine|
|`usage_num`| Metric | Number of event that logged for the device ID  | Query from analytics engine|


