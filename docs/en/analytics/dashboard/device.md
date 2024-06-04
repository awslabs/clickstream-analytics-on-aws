# Device report
The Device Report provides insights into the devices, operating systems, and browsers used by your app or website users. This data helps you understand your user base and optimize for the most common configurations.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report

1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Device`**.

## Where the data comes from

Device report is created based on the following QuickSight dataset:

|QuickSight dataset | Redshift view / table| Description | 
|----------|--------------------|------------------|
|`Device-<app>-<project>`|`clickstream_device_user_device_view` | This dataset stores data on the device information per each user for each day|
|`Crash_Rate-<app>-<project>`|`clickstream_device_crash_rate` | This dataset stores data on the crash rate for each app version for each day|


## Dimensions

The Device report includes the following dimensions. 

|Dimension | Description| How it's populated| 
|----------|--------------------|---------|
| App version | The version of the app  | Derived from the `app_version` field automatically collected by Clickstream SDK or manually set by HTTP API. |
| Device | The device name associated with the event. | For mobile app, it is derived from `model_name` field automatically collected by Clickstream SDK or manually set in HTTP request. For web, it is the `device_ua_device` that parsed from User Agent.|
| Device screen resolution | The screen resolution of the device  | Concatenation of `screen_width` and `screen_height` values|
| Browser | The name of the browser  | From the value of `device_ua_browser` field which parsed from the User Agent .|
| Operating system | The operating system of the device. | For mobile app, it is derived from `platform` field automatically collected by Clickstream SDK or manually set in HTTP request. For web, it is the `device_ua_operating_system` that parsed from User Agent.|
| Operating system version | The operating system version of the device. | For mobile app, it is derived from `os_version` field automatically collected by Clickstream SDK or manually set in HTTP request. For web, it is the `device_ua_operating_system_version` that parsed from User Agent.|

## Metrics
The Device report includes the following metrics.

|Metric | Definition| How it's calculated| 
|----------|--------------------|---------|
| Active users | Number of active users that had triggered any event.| Count distinct user_id or user_pseudo_id (if user_id is not available) |
| Crash rate | The percentage of the users experiencing app. | Number of distinct user with '_app_exception' events /  Total active users|

## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-device](../../images/analytics/dashboard/device.png)