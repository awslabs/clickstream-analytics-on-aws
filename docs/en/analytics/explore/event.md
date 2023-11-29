# Event Analysis
Event analysis is used to study the frequency of certain behavioral events. You can conduct multi-dimensional analysis of user behavior through custom metrics, groupings, filters, and various visual charts.

## Use cases
Event analysis are commonly used when analyzing user behaviors, for example:

- Query on user usage of certain product functions (such as adding favorite, video playback, view live stream, etc.);
- Compare different group of users's behaviors, such as number of login per different country
- Compare different channel's effectiveness, such as sign-up rate per traffic source.

## Key concept:
- **Metric**: perform aggregation on a selected event, such as count number of event, or count number of distinct users perform the event.

## How to use

1. Select an event, and select the aggregation method for the metric.
2. Add filter to the event by clicking the :material-filter-outline:{ .filter } icon next to the metric.
3. Select an event parameter or user attribute as filter. You can add multiple filters by clicking on the :material-filter-outline:{ .filter } icon. You can also configure the filter relationship by clicking on `AND` or `OR`.
4. Repeat above step to add more metric if needed.
5. If needed, configure global filter by selecting event parameter or user attributes. Similar to event filter, you can add multiple global filters and configure the filter relationship.
6. If needed, configure grouping by selecting an event parameter or user attribute
7. Click on Query button to start the analysis.
8. Adjust the data granularity, such as Daily, Weekly, Monthly, if needed.
9. Adjust query time range if needed.
10. Click on Save to Dashboard to save the analysis to a Dashboard, input a name, description, and select a dashboard and sheet.


## Example:

> Calculate the daily page views (PV - Page View) and active user count (UV - Unique Visitor) on the web from different countries over the past month, requiring active users to have a session duration of at least 30000 millisecond.

### Steps

1. Select the **Event Analysis** model.
2. In the left **Define Metrics** area, choose `_page_view` as the metric for calculating events and select `Event number` as the metric type.
3. Click the **+ Add Event** button to add another metric. Choose `_app_end` as the metric for calculating events and select `User number` as the metric type.
4. Click the filter icon to the right of `_app_end` to add a event filter condition:
    - Filter property: `event._session_duration`
    - Operation: `>=`
    - Value: `30000` (the unit of `event._session_duration` is millisecond)
5. Configure a global filter in the right **Filters** area:
    - Choose `other.platform` as the filter property.
    - Operation: `=`
    - Value: `Web`
6. In the right **Attribute Grouping** area, configure grouping by selecting `geo.country`.
7. In the time selector at the bottom, choose `Past Month` and click **OK**.
8. Click the **Save to Dashboard** button in the top right corner. In the pop-up dialog, enter:
    - Chart Name: `PV and UV`
    - Chart Description: `PV and UV on the web over the past month (at least 30 seconds)`
    - Choose a Dashboard: Select a dashboard. (You need to create a dashboard first, follow the [**Create dashboard**](../dashboard/index.md#create-dashboard),)
    - Choose a Worksheet: Select a worksheet.
    - Click **OK**.

All configurations are as shown in the image below:
![explore-event](../../images/analytics/explore/explore-event-en.png)