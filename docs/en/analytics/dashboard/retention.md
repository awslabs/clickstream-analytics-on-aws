# Retention report
You can use the Retention report to get insights into how frequently and for how long users engage with your website or mobile app after their first visit. This helps you understand how effective your product is at attracting users to return after their initial visit.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Retention`**.

## Data sources
Retention report is created based on the following QuickSight dataset:

|QuickSight dataset | Redshift view / table| Description | 
|----------|--------------------|------------------|
|`User_New_Return-<app>-<project>`|`clickstream_retention_user_new_return`| This dataset stores data on the number of new users and number of returning users for each day|
|`Retention_View-<app>-<project>`|`clickstream_retention_view_v3`| This dataset stores data on the cohort of user return by their first visit date and days since their first visit.|
|`Event_Overtime-<app>-<project>`|`clickstream_retention_event_overtime`| This dataset stores data on daily event counts. |
|`DAU_MAU-<app>-<project>`|`clickstream_retention_dau_wau`| This dataset stores the user_ids of active users for each day.|
|`Lifecycle_Weekly_View-<app>-<project>`|`clickstream_retention_dau_wau`| This dataset stores data on the number of new users, number of retained users, number of return users, and number of lost users for each week.|


## Metrics
The Retention report includes the following metrics.

|Metric | Definition| How it's calculated| 
|----------|--------------------|---------|
| New users |The number of users who visited your website or app for the first time.| Count distinct user_id or user_pseudo_id (if user_id is not available) when event_name equals '_first_open'.|
| Returning users | The number of users who have visited your website or app before.| Count distinct user_id or user_pseudo_id (if user_id is not available) when user_first_visit_date does not equal event_date.|
| Returning rate | The percentage of users returned over total users in that cohort.| Returning users / total users.|
| Lifecycle - New | Number of new users in the week.| Number of users that triggered no events in previous weeks.|
| Lifecycle - Retained | Number of users are active in this week and were active in last week.| Number of users that triggered events in previous week and this week.|
| Lifecycle - Return | Number of users visited before and were not active in previous week, but are active in this week (excludes new users).| Number of users that triggered events in at least two weeks before and are active in this week.|
| Lifecycle - Churn | Number of users were active in previous week, but are not active in this week.| Number of users that triggered events in previous week but triggered no event this week.|


## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-retention](../../images/analytics/dashboard/retention.png)