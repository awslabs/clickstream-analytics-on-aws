# Retention report
You can use the Retention report to get insights into how frequently and for how long users engage with your website or mobile app after their first visit. The report helps you understand how well your app is doing in terms of attracting users back after their first visit.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Retention`**.

## Where the data comes from
Retention report are created based on the following QuickSight dataset:

- `lifecycle_weekly_view-<app id>-<project id>`, which connects to the `clickstream_lifecycle_weekly_view` view in analytics engines (i.e., Redshift or Athena). 
- `lifecycle_daily_view-<app id>-<project id>`, which connects to the `clickstream_lifecycle_daily_view` view in analytics engines (i.e., Redshift or Athena). 
- `retention_view-<app id>-<project id>` that connects to the `clickstream_retention_view` view in analytics engines

Below is the SQL command that generates the view.
??? SQL Commands
    === "Redshift"
        ```sql title="clickstream-lifecycle-weekly-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/clickstream-lifecycle-weekly-view.sql:6"
        ```
        ```sql title="clickstream-lifecycle-dialy-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/clickstream-lifecycle-daily-view.sql:6"
        ```
    === "Athena"
        ```sql title="clickstream-lifecycle-weekly-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-lifecycle-weekly-query.sql"
        ```
        ```sql title="clickstream-lifecycle-daily-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-lifecycle-daily-query.sql"
        ```

## Dimensions and metrics
The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`Daily Active User (DAU)`| Metric | Number of active users per date | QuickSight aggregation|
|`Weekly Active User (WAU)`| Metric | Number of active users in last 7 days | Calculated field in QuickSight|
|`Monthly Active User (MAU)`| Metric | Number of active users in last 30 days  | Calculated field in QuickSight|
|`user_pseudo_id`| Dimension | A SDK-generated unique id for the user | Query from analytics engine|
|`user_id`| Dimension | The user ID set via the setUserId API in SDK  | Query from analytics engine|
|`DAU/WAU`| Metric | DAU/WAU % for user stickiness  | Calculated field in QuickSight|
|`WAU/MAU`| Metric | WAU/MAU % for user stickiness  | Calculated field in QuickSight|
|`DAU/MAU`| Metric | DAU/MAU % for user stickiness  | Calculated field in QuickSight|
|`Event User Type`| Dimension | The type of user performed the event, i.e., new user or existing user  | Calculated field in QuickSight|
|`User first touch date`| Metric |The first date that a user use your websites or apps  | Calculated field in QuickSight|
|`Retention rate`| Metric | Distinct active users number / Distinct active user number by User first touch date | Calculated field in QuickSight|
|`time_period`| Dimension | The week or day for the user lifecycle  | Query from analytics engine|
|`this_week_value`| Dimension | The user lifecycle stage, i.e., New, Active, Return, and Churn  | Query from analytics engine|
|`this_day_value`| Dimension | The user lifecycle stage, i.e., New, Active, Return, and Churn   | Query from analytics engine|

