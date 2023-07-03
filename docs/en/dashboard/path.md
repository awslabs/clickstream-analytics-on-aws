# Path Explorer report

You can use the Path Explorer report to get insights into the user journey when users using your apps or websites, it helps you understand the sequence of events and screen or page transition in your apps.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)

## View the report

1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Path explorer`**.

## Where the data comes from

Device report are created based on the following QuickSight dataset:

- `path_view-<app id>-<project id>`, which connects to the `clickstream_path_view` view in analytics engines (i.e., Redshift or Athena).

Below is the SQL command that generates the view.
??? example "SQL Commands"
    === "Redshift"
        ```sql title="clickstream-path-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/clickstream-path-view.sql:6"
        ```
    === "Athena"
        ```sql title="clickstream-path-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-path-query.sql"
        ```

## Dimensions and metrics

The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`event_id`| Dimension | The unique ID for the event|Query from analytics engine|
|`user_pseudo_id`| Dimension | A SDK-generated unique id for the user | Query from analytics engine|
|`event_date`| Dimension | The event data of when the device information was logged | Query from analytics engine|
|`event_timestamp`| Dimension | The timestamp when event happened  | Query from analytics engine|
|`platform`| Dimension | The platform user used when event is logged  | Query from analytics engine|
|`session_id`| Dimension | A SDK-generated unique id for the session user triggered when using your websites and apps | Query from analytics engine|
|`current_screen`| Dimension | The screen user is on for the event, 'null' for those events are not viewing screen or webpage | Query from analytics engine|
|`event_rank`| Dimension | The sequence of the event in a session | Query from analytics engine|
|`previous_event`| Dimension | The  event name of  previous event | Query from analytics engine|
|`next_event`| Dimension | The  event name of next event | Query from analytics engine|
|`previous_screen`| Dimension | The screen name of  previous screen | Query from analytics engine|
|`next_screen`| Dimension | The  screen name of  next screen | Query from analytics engine|


## Sample dashboard
Below image is a sample dashboard for your reference.

![qs-path](../images/dashboard/path.png)