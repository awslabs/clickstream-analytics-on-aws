# Exploration
Explorations is a collection of advanced analytics models that provides flexible and easy-to-use query method to analyze clickstream, allowing you to uncover deeper insights from your clickstream data.

When you want to explore the clickstream data in more detail, you can use explorations to:

- perform ad hoc queries 
- focus on the most relevant data by using filters on event parameters and user attributes
- group metrics by dimension to make it easy to compare
- easily switch visualization type and drill down or up into data
- view and export summary data into the excel or csv
- save the explorative analytics results into a dashboard for share or regular use


## Access Explorations
To access Explorations, follow below steps:

1. Go to **Clickstream Analytics on AWS Console**, in the **Navigation Bar**, click on "**Analytics Studio**", a new tab will be opened in your browser.
2. In the Analytics Studio page, click the **Explorations** icon in the left navigation panel.

## How Explorations works

Explorations currently provides 4 analytics models:

| Report name | What it is |
|-------------|------------|
|[Event Analysis](./event.md) | Event analysis is used to study the frequency of certain behavioral events. You can conduct multi-dimensional analysis of user behavior through custom metrics, groupings, filters, and various visual charts. |
|[Funnel Analysis](./funnel.md) | Funnel analysis, or conversion analysis, is mainly used to analyze the conversion status of users in a specified process. The model first breaks down the entire process into steps and then counts the conversion rate from each step to the next. It can be used to measure the performance of each step. Common usage scenarios include analyzing registration conversion rates, purchase conversion rates, etc. |
|[Path Analysis](./path.md) | Funnel analysis, or conversion analysis, is mainly used to analyze the conversion status of users in a specified process. The model first breaks down the entire process into steps and then counts the conversion rate from each step to the next. It can be used to measure the performance of each step. Common usage scenarios include analyzing registration conversion rates, purchase conversion rates, etc. |
|[Retention Analysis](./retention.md) | Retention analysis support configuring initial event and returning event to calculate the retention or attrition rate of target user groups. It also supports setting associated attributes for initial event and return event. |


## How to use Explorations
Explorations interface consists of the following components:

![analytics-explore](../../images/analytics/explore/explore.png)

1. **Analytics Model**. A drop-down list to select or switch analytics model.
2. **Model Configuration**. Specifies the configurations for the analytics model, such select event, adding filters. Each model might have different configuration.
3. **Global Filters**. Filters that apply to all the metrics that defined in the Model Configuration. You can add multiple filters and adjust the filter relationship (i.e., 'And' or 'Or').
4. **Grouping**. Group the analytics result by specified parameter's value, make it easy for you can compare the metrics at a dimension.
5. **Analysis Time Range**. Specifies the time range for the analysis.
6. **Aggregation Granularity**. Specifies the level of granularity to display metrics, such by day, week, or month.
7. **Visual Type**. Specifies the chart type of the visualization.
8. **Save to Dashboard**. Save the exploration analysis 
9.  **Result Display Area**. Show visualization and detail data.
10. **Help Panel**. Display additional helpful info when click "Info" icon.



