# Acquisition report
You can use the User acquisition report to get insights into how new users find your website or app for the first time. This report also allows you view the detail user profile.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Acquisition`**.

## Where the data comes from
Acquisistion report are created based on the QuickSight dataset of `user_dim_view-<app>-<project>`, which connects to the `clickstream_user_dim_view` view in analytics engine (i.e., Redshift or Athena). Below is the SQL command that generates the view.
??? SQL Commands
    === "Redshift"
        ```sql title="clickstream-user-dim-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/clickstream-user-dim-view.sql:6"
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
|`first_visit_date`| Dimension | The date that the user first visited your website or first opened the app  | Query from analytics engine|
|`first_install_source`| Dimension | The installation source when user first opened your app. Blank for web  | Query from analytics engine|
|`first_visit_device_language`| Dimension | The system language of the device user used when they first opened your app or first visited your website.  | Query from analytics engine|
|`first_visit_device_language`| Dimension | The system language of the device user used when they first opened your app or first visited your website.  | Query from analytics engine|
|`first_platform`| Dimension | The platform when user first visited your website or first opened your app  | Query from analytics engine|
|`first_visit_country`| Dimension | The country where user first visited your website or first opened your app.  | Query from analytics engine|
|`first_visit_city`| Dimension | The city where user first visited your website or first opened your app.  | Query from analytics engine|
|`custom_attr_key`| Dimension | The name of the custom attribute key of the user.  | Query from analytics engine|
|`custom_attr_value`| Dimension | The value of the custom attribute key of the user.  | Query from analytics engine|
|`is_registered`| Dimension | If user had registed or not  | Query from analytics engine|
  

















