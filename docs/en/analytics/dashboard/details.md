# Details report
You can use the Details report to view common and custom dimensions for individual events, query all user attributes for a specific user, and see the events that a particular user has performed.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md/#view-dashboards)
2. In the dashboard, click on the sheet with name of **`Details`**.

## Data sources
Details report is created based on the following QuickSight dataset:

|QuickSight dataset | Redshift view / table| Description | 
|----------|--------------------|------------------|
|`Event_View-<app>-<project>`|`clickstream_event_view_v3` | This datasets stores all the raw event data joined with user attributes and session attributes.|

## Dimensions

This report includes all the available dimensions for event, user, and session tables. Please refer to [Data Schema](../../pipeline-mgmt/data-processing/data-schema.md) for each dimension.


## Metrics
The report does not include any metrics by default. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-user](../../images/analytics/dashboard/details.png)
