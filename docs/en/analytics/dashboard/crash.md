# Crash report
Crash report provides metric and information about the crash events in your app.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md/#view-dashboards)
2. In the dashboard, click on the sheet with name of **`Crash`**.

## Where the data comes from
Crash report are created based on the following QuickSight datasets:

- `clickstream_user_dim_view_v1` - `Events_View-<app id>-<project id>` that connects to the `clickstream_event_view_v1` view in analytics engines (i.e., Redshift)
- `Events_Parameter_View-<app id>-<project id>` that connects to the `clickstream_events_parameter_view_v1` view in analytics engines  
??? example "SQL Commands"
    === "Redshift"
        ```sql title="clickstream_event_view_v1.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream-events-view_v1.sql:3"
        ```
    === "Athena"
        ```sql title="clickstream-ods-events-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-ods-events-query.sql"
        ```

## Dimensions and metrics
The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`user_pseudo_id`| Dimension | A SDK-generated unique id for the user | Query from analytics engine|
|`user_id`| Dimension | The user ID set via the setUserId API in SDK  | Query from analytics engine|
|`device_id`| Dimension | The unique ID for the device, please refer to [SDK Manual](../sdk-manual/index.md) for how the device id was obtained| Query from analytics engine|
|`Event Time (HH:MM:SS)`| Dimension |The time in MMDDYYYY HH:MM:SS format when the event was recorded in the client  | Calculated field in QuickSight|
|`event_id`| Dimension | A SDK-generated unique id for the event user triggered when using your websites and apps | Query from analytics engine|
|`event_name`| Dimension |The name of the event  | Query from analytics engine|
|`platform`| Dimension | The platform user used during the session  | Query from analytics engine|
|`Crash Rate (by device)`| Metric | The percentage of the devices with crash events  | Calculated field in QuickSight|
|`app_info_version`| Dimension | The app version associated with the event  | Query from analytics engine|
|`geo_locale`| Dimension | The geo and locale information associted with the event  | Query from analytics engine|
|`event_parameter_key`| Dimension | The key of the event parameter  | Query from analytics engine|
|`event_parameter_key`| Dimension | The value of the event parameter  | Query from analytics engine|
|`event_date`| Metric | The date when the event was logged (YYYYMMDD format in UTC).  | Query from analytics engine|
|`event_timestamp`| Dimension | The time (in microseconds, UTC) when the event was logged on the client. | Query from analytics engine|
|`app_info_version`| Dimension | The version of the app or website when event was logged  | Query from analytics engine|
|`app_info_package_id`| Dimension | The package id of the app or website when event was logged  | Query from analytics engine|
|`app_info_sdk_name`| Dimension | The sdk name  when event was logged  | Query from analytics engine|
|`app_info_sdk_version`| Dimension | The sdk version when event was logged  | Query from analytics engine|
|`app_info_package_id`| Dimension | The package id of the app or website when event was logged  | Query from analytics engine|
|`device_mobile_model_name`| Dimension | The model name for the device | Query from analytics engine|
|`device_network_type`| Dimension | The network type when user logged the events  | Query from analytics engine|
|`device_operating_system`| Dimension | The operating system of the device  | Query from analytics engine|
|`device_operating_system_version`| Dimension | The operating system version of the device  | Query from analytics engine|
  
## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-crash](../../images/analytics/dashboard/crash.png)
