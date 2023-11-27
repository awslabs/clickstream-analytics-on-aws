# Retention Analysis
Retention rate is a common metric used to assess the user stickiness for an app or website. Retention means that the user returns to your app or website again some time after they used your app. In addition to the standard retention metrics in the default dashboard, Retention Analysis module allow you to select a start event and returning event to customize a retention or attrition rate of a target user group. 

## Use cases
Retention analysis are commonly used to understand how well your app or website is doing in terms of retaining users, for example:

- Calculate new user retention rate to measure the effectiveness of traffic channel;
- Calculate the active users retention rate to measure teh effectiveness for a promotion campaign
- Compare the repurchase rate for different groups of users to identify the most-value customers.

## Key concept:
- **Start**: the event indicates that users start using the app or website. 
- **Revisit**: the event indicates that users returning to the app or website.
- **Associated parameter**: Associated parameter are used to keep the value of a parameter consistent between the starting event and the return event. For example, promotion campaign name, page title, or product titles must be the same values for both starting event and return event.
   
    !!! note

        The two associated parameter must both have value, and the value types must be consistent.

- **Retention Rate**:  retention rate % = the number of users performed the specified starting event on the start date (or week, or month depends on the granularity selection) / the number of the same users performed the specified returning event on the the return date (or week, or month) 



## How to use

1. Select a **Start** event, you can add filter to the event by clicking the :material-filter-outline:{ .filter } icon.
2. Select a **Revisit** event, you can add filter to the event by clicking the :material-filter-outline:{ .filter } icon.
3. If need to associate parameter, you can toggle on **Associate parameter**, then select parameter for both starting event and return event.
4. Repeat above step to add more metric if needed.
5. If needed, configure global filter by selecting event parameter or user attributes. Similar to event filter, you can add multiple global filters and configure the filter relationship.
6. If needed, configure grouping by selecting an event parameter or user attribute
7. Click on Query button to start the analysis.
8. Adjust the data granularity, such as Daily, Weekly, Monthly, if needed.
9. Specify query time range. 

    !!! note

        The start time will be the starting point (i.e., day 0) for the retention analysis, retention rate % will be calculated against the number of users performed the specified starting event on the start date (or week, or month depends on the granularity selection).

10. Click on Save to Dashboard to save the analysis to a Dashboard, input a name, description, and select a dashboard and sheet.


## Example:

> Calculate the retention rate of new customers who downloaded from different app markets on Android one week ago.

1. Select the **Retention Analysis** model.
2. Choose `_first_open` as the start event.
3. Choose `_app_start` as the return event.
4. Configure a global filter in the right **Filters** area:
    - Choose `other.platform` as the filter property.
    - Operation: `=`
    - Value: `Android`
5. In the right **Attribute Grouping** area, configure grouping by selecting `app_info.instal_source`.
6. Click **Query**.

All configurations are as shown in the image below:
![explore-funnel](../../images/explore/../analytics/explore/explore-retention-en.png)


