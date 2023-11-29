# Activity report
You can use the Activity report to get insights into the activities the users performed when using your websites and apps. This report measures user activity by the events that users triggered, and let you view the detail attributes of the events.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Activity`**.

## Where the data comes from
Activity report are created based on the following QuickSight datasets:

- `Events_View-<app id>-<project id>` that connects to the `clickstream_event_view_v1` view in analytics engines (i.e., Redshift)
- `Events_Parameter_View-<app id>-<project id>` that connects to the `clickstream_events_parameter_view_v1` view in analytics engines  

Below is the SQL command that generates the related views.
??? example "SQL Commands"
    === "Redshift"
        ```sql title="clickstream_event_view_v1.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_event_view_v1.sql:3"
        ```
    === "Athena"
        ```sql title="clickstream-ods-events-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-event-query.sql"
        ```

## Dimensions and metrics
The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`event_id`| Dimension | A SDK-generated unique id for the event user triggered when using your websites and apps | Query from analytics engine|
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
|`Views`| Metrics | Number of events that are `_screen_view` or `_page_view`  | Calculated field in QuickSight|
|`Screen Time`| Metrics | Engagement time (in minute) on a screen or web page  | Calculated field in QuickSight|


## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-activity](../../images/analytics/dashboard/activity.png)