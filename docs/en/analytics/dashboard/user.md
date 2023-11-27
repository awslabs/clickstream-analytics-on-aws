# user report
You can use the User report to query and view individual user' attributes and the events the user performed.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md/#view-dashboards)
2. In the dashboard, click on the sheet with name of **`User`**.

## Where the data comes from
User report are created based on the QuickSight dataset of:

- `User_Dim_View-<app>-<project>` which connects to the `clickstream_user_dim_view_v1` view in analytics engine (i.e., Redshift)
- `User_Attr_View-<app>-<project>` which connects to `clickstream_user_attr_view_v1`. Below is the SQL command that generates the view.
??? example "SQL Commands"
    === "Redshift"
        ```sql title="clickstream_user_dim_view_v1.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_user_dim_view_v1.sql:6"
        ```
    === "Athena"
        ```sql title="clickstream-user-dim-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-user-dim-query.sql"
        ```

## Dimensions and metrics
The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`user_pseudo_id`| Dimension | A SDK-generated unique id for the user | Query from analytics engine|
|`user_id`| Dimension | The user ID set via the setUserId API in SDK  | Query from analytics engine|
|`device_id`| Dimension | The unique ID for the device, please refer to [SDK Manual](../sdk-manual/index.md) for how the device id was obtained| Query from analytics engine|
|`first_visit_date`| Dimension | The date that the user first visited your website or first opened the app  | Query from analytics engine|
|`first_visit_install_source`| Dimension | The installation source when user first opened your app. Blank for web  | Query from analytics engine|
|`first_traffic_source_source`| Dimension | The traffic source for the user when first visit the app or web  | Query from analytics engine|
|`first_traffic_source_meidum`| Dimension | The traffic medium for the user when first visit the app or web  | Query from analytics engine|
|`first_traffic_source_name`| Dimension | The traffic campaign name for the user when first visit the app or web  | Query from analytics engine|
|`first_visit_device_language`| Dimension | The system language of the device user used when they first opened your app or first visited your website.  | Query from analytics engine|
|`first_visit_device_language`| Dimension | The system language of the device user used when they first opened your app or first visited your website.  | Query from analytics engine|
|`first_platform`| Dimension | The platform when user first visited your website or first opened your app  | Query from analytics engine|
|`first_referer`| Dimension | The referer when user first visited your website | Query from analytics engine|
|`first_visit_country`| Dimension | The country where user first visited your website or first opened your app.  | Query from analytics engine|
|`first_visit_city`| Dimension | The city where user first visited your website or first opened your app.  | Query from analytics engine|
|`custom_attr_key`| Dimension | The name of the custom attribute key of the user.  | Query from analytics engine|
|`custom_attr_value`| Dimension | The value of the custom attribute key of the user.  | Query from analytics engine|
|`registration_status`| Dimension | If user had registed or not  | Query from analytics engine|
|`Event Time (HH:MM:SS)`| Dimension |The time in MMDDYYYY HH:MM:SS format when the event was recorded in the client  | Calculated field in QuickSight|
|`event_id`| Dimension | A SDK-generated unique id for the event user triggered when using your websites and apps | Query from analytics engine|
|`event_name`| Dimension |The name of the event  | Query from analytics engine|
|`platform`| Dimension | The platform user used during the session  | Query from analytics engine|
|`event_value_in_usd`| Metric | The value in USD associated with the event  | Query from analytics engine|
|`app_info_version`| Dimension | The app version associated with the event  | Query from analytics engine|
|`geo_locale`| Dimension | The geo and locale information associted with the event  | Query from analytics engine|
|`event_parameter_key`| Dimension | The key of the event parameter  | Query from analytics engine|
|`event_parameter_key`| Dimension | The value of the event parameter  | Query from analytics engine|
|`event_date`| Metric | The date when the event was logged (YYYYMMDD format in UTC).  | Query from analytics engine|
|`event_timestamp`| Dimension | The time (in microseconds, UTC) when the event was logged on the client. | Query from analytics engine|
|`app_info_version`| Dimension | The version of the app or website when event was logged  | Query from analytics engine|
  
## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-user](../../images/analytics/dashboard/user.png)
