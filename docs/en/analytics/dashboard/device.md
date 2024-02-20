# Device report

You can use the Device report to get insights into the devices that users used when using your apps or websites. The report provides more information for your user profile.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report

1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Device`**.

## Where the data comes from

Device report are created based on the following QuickSight dataset:

- `Device_View-<app id>-<project id>`, which connects to the `clickstream_device_view` view in analytics engines (i.e., Redshift or Athena). 

Below is the SQL command that generates the view.
??? example "SQL Commands"
    === "Redshift"
        ```sql title="clickstream_device_view.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_device_view_v1.sql:6"
        ```
    === "Athena"
        ```sql title="clickstream-device-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-device-query.sql"
        ```

## Dimensions and metrics

The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`device_id`| Dimension | The unique ID for the device, please refer to [SDK Manual](../../sdk-manual/index.md) for how the device id was obtained| Query from analytics engine|
|`user_pseudo_id`| Dimension | A SDK-generated unique id for the user | Query from analytics engine|
|`user_id`| Dimension | The user ID set via the setUserId API in SDK  | Query from analytics engine|
|`event_date`| Dimension | The event data of when the device information was logged | Query from analytics engine|
|`mobile_brand_name`| Dimension | The brand name for the device  | Query from analytics engine|
|`mobile_model_name`| Dimension | The model name for the device | Query from analytics engine|
|`manufacturer`| Dimension | The manufacturer for the device | Query from analytics engine|
|`network_type`| Dimension | The network type when user logged the events  | Query from analytics engine|
|`operating_system`| Dimension | The operating system of the device  | Query from analytics engine|
|`operating_system_version`| Dimension | The operating system version of the device  | Query from analytics engine|
|`screen_height`| Dimension | The screen height of the device  | Query from analytics engine|
|`screen_width`| Dimension | The screen width of the device  | Query from analytics engine|
|`Screen Resolution`| Dimension | The screen resolution (i.e., screen height x screen width) of the device  | Calculated field in QuickSight|
|`system_language`| Dimension | The system language of the solution  | Query from analytics engine|
|`us_browser`| Dimension | The browser derived from user agent  | Query from analytics engine|
|`us_browser_version`| Dimension | The browser version derived from user agent  | Query from analytics engine|
|`us_os`| Dimension | The operating system derived from user agent  | Query from analytics engine|
|`us_device`| Dimension | The device derived from user agent  | Query from analytics engine|
|`us_device_category`| Dimension | The device category derived from user agent  | Query from analytics engine|
|`usage_num`| Metric | Number of event that logged for the device ID  | Query from analytics engine|

## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-device](../../images/analytics/dashboard/device.png)