# Funnel Analysis
Funnel analysis, or conversion analysis, is mainly used to analyze the conversion status of users in a specified process. The model first breaks down the entire process into steps and then counts the conversion rate from each step to the next. It can be used to measure the performance of each step. 

## Use cases
Funnel analysis are commonly used when analyzing user behaviors, for example:

- Analysis of the conversion rate of the key process in a product: such as order to purchase rate, registration completion rate;
- Analysis of the conversion rate of promotion: for example, conversion rate of different in-app promotion spot;
- Analysis of marketing channels's effectiveness: for example, purchase rate of new users brought by different ad campaigns.

## Key concepts

- **Metric**: the entity used for funnel analysis, such as event number or user number.
- **Funnel**: a funnel is a sequence of events that represents a process, it contains at least two events, each event represents a step in the funnel.
- **Funnel window**: he funnel Window refers to the time for the user to complete the entire process. Only when the user completes all the selected steps within the set window period is considered a successful conversion.

## How to use

1. Select a metric type. 
    1. User number: calculate the number of distinct users pass through the entire funnel.
    2. Event number: calculate the number of completion of the entire funnel.
2. Configure the funnel window.
    1. Custom: you can define any duration as the funnel window.
    2. The day: complete the funnel within the same date of the first step.
3. Select event for as the step, click the `+Add Step` button to add more steps. You can add up to 10 steps.
4. Click on the :material-filter-outline:{ .filter } to filter the event. Only the event meet with the filter criterial that will be counted as pass through the funnel. You can add multiple filters to one event.
5. If needed, configure global filter by selecting event parameter or user attributes. Similar to event filter, you can add multiple global filters and configure the filter relationship.
6. If needed, configure grouping by selecting an event parameter or an user attribute.
   
    !!! note

        The Funnel visualization does not support grouping, if you need to group funnel result, please select bar chart.

7. If you want to only apply the grouping on the first event, toggle on `Apply grouping to first step only`. If this option is not selected, the grouping will apply to all the steps in the funnel, which means all the events should have parameter or attributes that used to group.
8. Click on `Query` button to start the analysis. 
9. Adjust the data granularity, such as `Daily`, `Weekly`, `Monthly`, if needed.
10. Adjust query time range if needed.
11. Click on `Save to Dashboard` to save the analysis to a Dashboard, input a name, description, and select a dashboard and sheet.

## Example

> Calculate the conversion rate of users on the web from opening the website -> viewing the product details page -> adding to the shopping cart -> making a payment over the past week.

1. Select the **Funnel Analysis** model.
2. Choose `User number` as the metric.
3. In the left **Define Funnel** area, choose `The Day` as the funnel window.
4. Choose `_session_start`, `view_item`, `add_to_cart`, `purchase` as funnel events.
5. Configure a global filter in the right **Filters** area:
    - Choose `other.platform` as the filter property.
    - Operation: `=`
    - Value: `Web`
6. Click **Query**.

All configurations are as shown in the image below:
![explore-funnel](../../images/analytics/explore/explore-funnel-en.png)