# Analyzes
Analyzes module allows user to create and modify dashboards based on the clickstream datasets in a drag-and-drop approach. It provides greater flexibility for users to create business-specific metrics and visualizations. Use the modules when you want to:

- create dashboard that are not provided in preset dashboard or not supported by explorations.
- make changes to the custom dashboard saved from exploration analysis, such as adding calculation fields to calculate custom metrics, adjust visual types etc.
- join clickstream data with external datasets, such as adding item master data to enrich clickstream datasets.

## Access Analyzes

To access Analyzes, follow below steps:

1. Go to **Clickstream Analytics on AWS Console**, in the **Navigation Bar**, click on "**Analytics Studio**", a new tab will be opened in your browser.
2. In the Analytics Studio page, click the **Analyzes** icon in the left navigation panel.


## How it works
Analyzes module is essentially the author interface of QuickSight, in which you have the admin access to all the QuickSight functionalities, e.g., create analysis, add or manage datasets, publish and share dashboards. 

!!! note "Note"

    Only the user with `Administrator` or `Analyst` role can access this module.



The solution automatically added the following datasets for each project and app:

| Dataset name | What it is |
|-------------|------------|
|Event_View_`app_name`_`project_name`| Event data that includes all public event parameters |
|Event_Parameter_View_`app_name`_`project_name`| Events data that includes all private event parameters|
|User_Dim_View_`app_name`_`project_name`| User data that includes all public attributes|
|User_Attr_View_`app_name`_`project_name`| User data that includes all private(custom) attributes|
|Session_View_`app_name`_`project_name`| Data contains measures and dimension about session|
|Device_View_`app_name`_`project_name`| Data contains information about user device|
|Retention_View_`app_name`_`project_name`| Data provides metrics on total users and returned user for each date|
|Lifecycle_Weekly_View_`app_name`_`project_name`| User lifecycle metrics for every week|
|Lifecycle_Daily_View_`app_name`_`project_name`| User lifecycle metrics for every date|


To create a custom analysis, you can follow below QuickSight documentation to prepare data and create visualization:

1. [Connecting to data](https://docs.aws.amazon.com/quicksight/latest/user/working-with-data.html)
2. [Preparing data](https://docs.aws.amazon.com/quicksight/latest/user/preparing-data.html)
3. [Visualizing data](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)