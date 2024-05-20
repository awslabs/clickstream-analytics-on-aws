# Dashboard
{{ solution_name }} solution collects data from your websites and apps to create dashboards that derive insights. You can use dashboards to monitor traffic, investigate data, and understand your users and their activities.

Depends on your pipeline configuration, the time for data to be available in your dashboard varies. By default, the metrics in the out-of-the-box dashboards are calculated on a daily basis, you should see the data and metrics from previous day (according to your app's timezone).


## View dashboards
You can find the dashboards for each application by following below steps:

1. Go to **Clickstream Analytics on AWS Console**, in the left-side **Navigation Bar**, click on "**Analytics Studio**", a new tab will be opened in your browser.
2. In the Analytics Studio page, select the project and app you just created in the drop-down list in the top of the web page.
3. Click the **User life cycle - default** dashboard

## Default Dashboard
The dashboards contain a set of reports covering the user life cycle, helps you understand how people use your website or app, from acquisition to retention.

| Report name | What it is |
|-------------|------------|
|[Acquisition](./acquisition.md) | Summarizes key metrics about new users and traffic source|
|[Engagement](./engagement.md) | Summarizes key metrics about user engagement levels, events, pages and screen, and sessions|
|[Retention](./retention.md) | Summarizes key metrics about active users and user retentions |
|[Device](./device.md) | Summarizes key metrics about the devices users are using to access your apps and websites|
|[Details](./details.md)| This report allows you to query and view user' attributes and the events the user performed.|


## Custom report
When you want to investigate certain pieces of data further, you can write SQL to create views in Redshift or Athena, then add dataset into QuickSight to create visualization. Here is an example, [**Custom report**](./custom-analysis.md), to demonstrate how to create a customized report with Redshift. 


## Create dashboard
You can create a custom dashboard to save the result of exploration query. Below are the steps:

1. Click **Create Dashboard** button on the top-left.
2. Fill in a name as **Dashboard name**.
3. Fill in a description for the dashboard.
4. Enter a sheet name, then click on the `+` button on the right. You can add multiple sheets in one dashboard.
5. You can remove a sheet by click on the `X` button on the sheet name.
6. Click **Create** button.
7. After the dashboard was created, you can select the dashboard to save query results.