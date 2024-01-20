# Acquisition report
You can use the User acquisition report to get insights into how new users find your website or app for the first time. This report also allows you view the detail user profile.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md/#view-dashboards)
2. In the dashboard, click on the sheet with name of **`Acquisition`**.

## Where the data comes from
Acquisition report are created based on the QuickSight dataset of `User_Dim_View-<app>-<project>`, which connects to the `clickstream_user_dim_view` view in analytics engine (i.e., Redshift). Below is the SQL command that generates the view.
??? example "SQL Commands"
    === "Redshift"
        ```sql title="clickstream-user-dim-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_user_dim_view_v1.sql:3"
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
|`device_id`| Dimension | The unique ID for the device, please refer to [SDK Manual](../../sdk-manual/index.md) for how the device id was obtained| Query from analytics engine|
|`first_visit_date`| Dimension | The date that the user first visited your website or first opened the app  | Query from analytics engine|
|`first_visit_install_source`| Dimension | The installation source when user first opened your app. Blank for web  | Query from analytics engine|
|`first_traffic_source_source`| Dimension | The traffic source for the user when first visit the app or web  | Query from analytics engine|
|`first_traffic_source_medium`| Dimension | The traffic medium for the user when first visit the app or web  | Query from analytics engine|
|`first_traffic_source_name`| Dimension | The traffic campaign name for the user when first visit the app or web  | Query from analytics engine|
|`first_visit_device_language`| Dimension | The system language of the device user used when they first opened your app or first visited your website.  | Query from analytics engine|
|`first_visit_device_language`| Dimension | The system language of the device user used when they first opened your app or first visited your website.  | Query from analytics engine|
|`first_platform`| Dimension | The platform when user first visited your website or first opened your app  | Query from analytics engine|
|`first_referer`| Dimension | The referer when user first visited your website | Query from analytics engine|
|`first_visit_country`| Dimension | The country where user first visited your website or first opened your app.  | Query from analytics engine|
|`first_visit_city`| Dimension | The city where user first visited your website or first opened your app.  | Query from analytics engine|
|`custom_attr_key`| Dimension | The name of the custom attribute key of the user.  | Query from analytics engine|
|`custom_attr_value`| Dimension | The value of the custom attribute key of the user.  | Query from analytics engine|
|`registration_status`| Dimension | If user had registered or not  | Query from analytics engine|
|`Logged-in Rate`| Metric | Number of distinct user_id divide by number of distinct user_pseudo_id | Calculated field in QuickSight |
  
## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-acquisition](../../images/analytics/dashboard/acquisition.png)

















