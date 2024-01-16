# Engagement report
You can use the Engagement report to get insights into the engagement level of the users when using your websites and apps.  This report measures user engagement by the sessions that users trigger and the web pages and app screens that users visit.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md).
2. In the dashboard, click on the sheet with name of `Engagement`.

## Where the data comes from
Engagement report are created based on the QuickSight dataset of `Session_View-<app id>-<project id>`, which connects to the `clickstream_session_view_v1` view in analytics engines (i.e., Redshift or Athena). Below is the SQL command that generates the view.
??? example "SQL Commands"
    === "Redshift"
        ```sql title="clickstream-session-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_session_view_v2.sql:7"
        ```
    === "Athena"
        ```sql title="clickstream-session-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-session-query.sql"
        ```

## Dimensions and metrics
The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`session_id`| Dimension | A SDK-generated unique id for the session user triggered when using your websites and apps | Query from analytics engine|
|`user_pseudo_id`| Dimension | A SDK-generated unique id for the user  | Query from analytics engine|
|`platform`| Dimension | The platform user used during the session  | Query from analytics engine|
|`session_duration`| Dimension | The length of the session in millisecond  | Query from analytics engine|
|`session_views`| Metric | Number of screen view or page view within the session  | Query from analytics engine|
|`engaged_session`| Dimension | Whether the session is engaged or not. </br>`Engaged session is defined as if the session last more than 10 seconds or have two or more screen views page views` | Query from analytics engine|
|`session_start_timestamp`| Dimension | The start timestamp of the session  | Query from analytics engine|
|`session_engagement_time`| Dimension | The total engagement time of the session in millisecond  | Query from analytics engine|
|`entry_view`| Dimension | The screen name or page title of the first screen or page user viewed in the session  | Query from analytics engine|
|`exit_view`| Dimension | The screen name or page title of the last screen or page user viewed in the session  | Query from analytics engine|
|`Average engaged session per user`| Metric | Average number of session per user in the selected time period  | Calculated field in QuickSight|
|`Average engagement time per session`| Metric | Average engagement time per session in the selected time period  | Calculated field in QuickSight|
|`Average engagement time per user`| Metric | Average engagement time per user in the selected time period  | Calculated field in QuickSight|
|`Average screen view per user`| Metric | Average number of screen views per user in the selected time period  | Calculated field in QuickSight|

## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-engagement](../../images/analytics/dashboard/engagement.png)
