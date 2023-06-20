# Dashboard
{{ solution_name }} solution collects data from your websites and apps to create dashboards that derive insights. You can use dashboards to monitor traffic, investigate data, and understand your users and their activities.

Once the data are processed by the data pipeline, the data appears in the QuickSight dashboards. Depends on your pipeline configuration, the time for data to be available in your dashboard varies. For example, if you set the data processing interval to be 1 day, the dashboard will show data at T+1 day (T as reporting date).


## View dashboards
You can find the dashboards for each application by following below steps:

1. Go to **Clickstream Analytics on AWS Console**, in the **Navigation Bar**, click on "**Project**", then click the project you want to view dashboards.
2. In the project detail page, click on `pipeline ID` or **View Details** button, it will bring you to the pipeline detail page.
3. In the pipeline details page, select the tab of **Reporting**, you will see the link to the dashboards created for your app.
4. Click on the dashboard link with the name of your app, it will bring you to the QuickSight dashboard. 
5. Click on the dashboard with name start with `Clickstream`.

## Reports
The dashboards contains a set of reports covering the following topics.

| Report name | What it is |
|-------------|------------|
|[Acquisition](./acquisition.md) | Summarizes key metrics about new users, provides detail view user profile|
|[Engagement](./engagement.md) | Summarizes key metrics about user engagements and sessions|
|[Activity](./activity.md) | Summarizes key metrics about events user generates in the app, provide detail view of event attributes|
|[Retention](./retention.md) | Summarizes key metrics about active users and user retentions |
|[Device](./device.md) | Summarizes key metrics about the devices users are using to access your apps and websites, provides detail view of each device|
|[Path explorer](./path.md)| Provides charts for you to understand user journey in your apps and websites|


## Custom report
When you want to investigate certain pieces of data further, you can write SQL to create views in Redshift or Athena, then add dataset into QuickSight to create visualization. Here is an example, [**Custom report**](./custom-analysis.md), to demonstrate how to create a customize report with Redshift. 