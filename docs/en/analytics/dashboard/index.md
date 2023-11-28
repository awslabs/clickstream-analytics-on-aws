# Dashboard
{{ solution_name }} solution collects data from your websites and apps to create dashboards that derive insights. You can use dashboards to monitor traffic, investigate data, and understand your users and their activities.

Once the data are processed by the data pipeline, the data appears in the QuickSight dashboards. Depends on your pipeline configuration, the time for data to be available in your dashboard varies. For example, if you set the data processing interval to be 1 day, the dashboard will show data at T+1 day (T as reporting date).


## View dashboards
You can find the dashboards for each application by following below steps:

1. Go to **Clickstream Analytics on AWS Console**, in the **Navigation Bar**, click on "**Analytics Studio**", a new tab will be opened in your browser.
2. In the Analytics Studio page, select the project and app you just created in the drop-down list in the top of the web page.
3. Click the **User life cycle - default** dashboard

## Default Dashboard
The dashboards contains a set of reports covering the user life cycle, helps you understand how people use your website or app, from acquisition to retention.

| Report name | What it is |
|-------------|------------|
|[Acquisition](./acquisition.md) | Summarizes key metrics about new users, provides detail view of user profile|
|[Engagement](./engagement.md) | Summarizes key metrics about user engagements and sessions|
|[Activity](./activity.md) | Summarizes key metrics about events user generates in the app, provide detail view of event attributes|
|[Retention](./retention.md) | Summarizes key metrics about active users and user retentions |
|[Device](./device.md) | Summarizes key metrics about the devices users are using to access your apps and websites, provides detail view of each device|
|[User](./user.md)| This report allows you to query and view individual user' attributes and the events the user performed.|
|[Crash](./crash.md)| This report provides metric and information about the crash events in your app.|


## Custom report
When you want to investigate certain pieces of data further, you can write SQL to create views in Redshift or Athena, then add dataset into QuickSight to create visualization. Here is an example, [**Custom report**](./custom-analysis.md), to demonstrate how to create a customize report with Redshift. 


## Create dashboard
You can create a custom dashboard to save the result of exploration query. Below are the steps:

1. Click **Create Dashboard** button on the top-left.
2. Fill in a name as **Dashboard name**.
3. Fill in a description for the dashboard.
4. Enter a sheet name, then click on the `+` button on the right. You can add multiple sheets in one dashboard.
5. You can remove a sheet by click on the `X` button on the sheet name.
6. Click **Create** button.
7. After the dashboard was created, you can select the dashboard to save query results.