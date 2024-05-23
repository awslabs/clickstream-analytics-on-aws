# Custom report
One of the key benefits of this solution is that you have complete control over the clickstream data collected from your apps and websites. This provides you with the flexibility to analyze the data according to your specific business needs.

There are two options to create custom analyses. The following examples will guide you through the detailed steps.

## Option 1 - create custom analysis with preset QuickSight dataset
The solution had created a `Event_View-<app>-<project>` dataset which stores all the raw event data, includes both common and custom dimension, joined with user attributes and session attributes in QuickSight, you can use this datasets to create custom analysis based on your specific requirements.

For example, let's say you have a custom event `view_item` that records when a user views an item's detail page. This custom event has a custom attribute `event_category` to track the promotion spot from which the user came to the item detail page. Now, you want to create a custom analysis that uses a pie chart to show the percentage of each event_category that led user to item detail pages.

1. Go to Analyze module in {{solution_name}} web console.
2. Click on `New analysis` button in the top-right corner.
3. Select `Event_View-<app>-<project>` dataset.
4. Click on `USE IN ANALYSIS` button.
5. Since the `event_category` is a custom parameter for the `view_item` event, we need to extract it from the `custom_parameters_json_str` field, which is a JSON string, we can use [**parseJSON**](https://docs.aws.amazon.com/quicksight/latest/user/parseJson-function.html) function to extract values from it. Click on `+ CALCULATED FIELD` button to add a calculated field.
6. Input "Event Category" as the name for the calculated field, and input `parseJson({custom_parameters_json_str}, "$.event_category")` as the formula, then click `Save` button.
7. Now you back to the analysis author console, you can see a new field called `Event Category` appear in the Data panel.
8. In the Visuals panel, click on `+ ADD` button, and select Pie chart.
9. Drag the `Event Category` field to GROUP/COLOR, drag `event_id` to VALUE. 
10. In the Filter panel, add a filter to only include  `event_name` equals `view_item `.
11. Now you should be able to see a bar chart shows the percentage of each event_category that led to `view_item` events. 
12. You can format the analysis according to your need then publish it as dashboard.
13. To enable your custom analysis to appear in the Dashboards module of the Clickstream Analytics Studio, you need to add the dashboard into the Shared folder with name of the `<project-id>_<app_id>`, which was pre-created by the solution. After you added the custom dashboard into the Shared folder, it will automatically display in the Clickstream Analytics Studio.

## Option 2 - create custom view in Redshift and import to QuickSight

Creating a custom report mainly consists of two parts, the first part is to prepare the dataset in your analytics engine, the second part is to create visualization in QuickSight.

### Part 1 - Dataset preparation

1. Open **Redshift Serverless dashboard**
2. Click the workgroup starting with `clickstream-<project-id>` created by the solution.
3. Click on the `Query data` button, you will be directed to the Redshift Query Editor.
4. In the `Editor` view on the Redshift Query Editor, right-click on the workgroup with name of `clickstream-<project-id>`. In the prompted drop-down, select `Edit connection`, you will be asked to provide connection parameters. Follow this [guide](https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html){:target="_blank"} to use an appropriate method to connect.

    !!! info "Important"

        You will need read and write permissions for the database (with name as `<project-id>`) to create custom view or table. For example, you can use Admin user to connect to the cluster or workgroup. If you don't know the password for the Admin user, you can reset the admin password in the Redshift Console ([Learn more](https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-security.html){:target="_blank"}). 

5. If it is the first time you access the query editor, you will be prompted to configure the account, please click **Config account** button to open query editor.
6. Add a new SQL editor, and make sure you selected the correct workgroup and schema.
7. Create a new view for funnel analysis. In this example, we used below SQL.
  
    ??? example "SQL Commands"
        ```sql
            CREATE OR REPLACE VIEW {{schema}}.clickstream_funnel_view as 
            SELECT
            platform,
            COUNT(DISTINCT step1_id) AS session_start_users,
            COUNT(DISTINCT step2_id) AS page_view_users,
            COUNT(DISTINCT step3_id) AS scroll_users
            FROM (
            SELECT
                platform,
                user_pseudo_id AS step1_id,
                event_timestamp AS step1_timestamp, 
                step2_id,
                step2_timestamp,
                step3_id,
                step3_timestamp
            FROM
                {{schema}}.clickstream_event_base_view
            LEFT JOIN (
            SELECT
                user_pseudo_id AS step2_id,
                event_timestamp AS step2_timestamp
            FROM
                {{schema}}.clickstream_event_base_view
            WHERE
                event_name = '_page_view' )
            ON
                user_pseudo_id = step2_id
                AND event_timestamp < step2_timestamp
            LEFT JOIN (
            SELECT
                user_pseudo_id AS step3_id,
                event_timestamp AS step3_timestamp
            FROM
                {{schema}}.clickstream_event_base_view
            WHERE
                event_name= '_scroll' )
            ON
                step3_id  = step2_id
                AND step2_timestamp < step3_timestamp
            WHERE
            event_name = '_session_start' )
            group by
            platform
        ```

8. Go to QuickSight console, click '**Dataset**', and then click '**New dataset**'.

9. In the New Dataset page, click **Redshift Manual connect** to add dataset, fill in the prompted form with the following parameters. 
      - **Data source name**: `clickstream-funnel-view-<project-id>`
      - **Connection type**: select `VPC connections` / `VPC Connection for Clickstream pipeline <project-id>`
      - **Database server**: input the endpoint url of the serverless workgroup, which you can find on the workgroup console.
      - **Port**: `5439`
      - **Database name**: `<project-id>`
      - **User name**: name of the user you used to create the custom view in previous steps
      - **Password**: password of the user you used to create the custom view in previous steps
10. Validated the connection, if ok, click **Create data source** button.
11. Choose the view from Redshift as data source - "**clickstream_funnel_view**", then
    - Schema: select your schema
    - Tables: `clickstream_funnel_view`

    !!! tip "Tip"

        You will be prompt to select `Import to SPICE` or `Directly query your data`, please select `Directly query your data`.

    - Click **Edit/Preview data** to preview the data, once you're familiar with the data, click  **PUBLISH & VISUALIZE** at the top-right.

### Part 2 - Create visualization in QuickSight
   
1. You will be prompt to select a layout for your visualization, select one per your need.
2. Click "**+Add**" at the top-left of the screen then click "**Add visual**" button.
3. Select a Visual type at the bottom-left of the screen, in this example, select **Vertical bar chart**
4. In the Field wells, select `platform` as X axis, `session_start_users`, `page_view_users`, and `scroll_users` as Value.
5. You now can publish this analysis as dashboard or continue to format it. Learn more about QuickSight visualization in this [link](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html){:target="_blank"}


### Part 3 - Add the custom dashboard to Analytic Studio

To enable your custom analysis to appear in the Dashboards module of the Clickstream Analytics Studio, you need to add the dashboard into the Shared folder with name of the `<project-id>_<app_id>`, which was pre-created by the solution.

After you added the custom dashboard into the Shared folder, it will automatically display in the Clickstream Analytics Studio.
