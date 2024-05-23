# Engagement report
You can use the Engagement report to get insights into how users interact with your websites and apps. It shows metrics around user engagement levels, activities performed, and which pages/screens are most visited.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Engagement`**.

## Data sources
Engagement report is created based on the following QuickSight datasets:

|QuickSight dataset | Redshift view / table| Description | 
|----------|--------------------|------------------|
|`Engagement_KPI-<app>-<project>`|`clickstream_engagement_kpi` | This dataset stores data on Engagement KPIs per day.|
|`Day_Event_View_Engagement-<app>-<project>`|`clickstream_engagement_day_event_view`|This dataset stores data on the number of events and number of view events for each day|
|`Event_Name-<app>-<project>`|`clickstream_engagement_event_name`| This dataset stores data on the number of events per event name for each user for each day.|
|`Page_Screen_View-<app>-<project>`|`clickstream_engagement_page_screen_view`|This dataset stores data on the number of views per each page or screen for each day.|
|`Page_Screen_View_Detail-<app>-<project>`|`clickstream_engagement_page_screen_detail_view`| This dataset stores data on the view event per page title/ page url or screen name/screen id for each user for each day.|

## Dimensions
The Engagement report includes the following dimensions.

|Dimension | Description| How it's populated| 
|----------|--------------------|---------|
| Event name | Name of the event triggered by users  | Derived from the event name you set for an event with Clickstream SDK or HTTP API. |
| Page title | Title of the web page. | Page title derives from the `title` tag in your HTML.|
| Page URL path | The path in the web page URL  | Page path derives from the value after the domain. For example, if someone visits `www.example.com/books`, then `example.com` is the domain and `/books` is the page path.|
| Screen name | Title of the screen  | Screen name derives from the name you set for a screen using clickstream SDK or HTTP API .|
| Screen class | The class name of the screen. | Screen class derives from the class name of the UIViewController or Activity that is currently in focus.|

## Metrics
The Engagement report includes the following metrics.

|Metric | Definition| How it's calculated| 
|----------|--------------------|---------|
| Avg_session_per_user |The average number of sessions per active user.| Total number of sessions / total number of active users|
| Avg_engagement_time_per_user_minute | The average time per user that your website was in focus in a user's browser or an app was in the foreground of a user's device.| Total user engagement durations / Number of active users |
| Avg_engagement_time_per_session_minute | The average time per session that your website was in focus in a user's browser or an app was in the foreground of a user's device| Total user engagement durations / Number of sessions |
| Active users | Number of active users that had page_view or screen_view events.| Count distinct user_id or user_pseudo_id (if user_id is not available) when event_name is '_page_view' or '_screen_view'. |
| Event count | The number of times users triggered a '_page_view' or '_screen_view' event.| Count event_id when event_name is '_page_view' or '_screen_view'. |
| Event count per user | Average event count per user.| Event count / Active users |

## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-activity](../../images/analytics/dashboard/engagement.png)