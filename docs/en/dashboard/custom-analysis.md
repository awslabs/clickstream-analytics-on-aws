# Custom report
One of the key benefits of this solution is that you have 100% control over the clickstream data collected from your apps and websites. You have complete flexibility to analyze the data for your specific business needs. 
This article illustrates the steps of creating a custom report with an example of creating funnel analysis by using Redshift Serverless as analytics engine and QuickSight as reporting tools.

## Steps 

Creating a custom report mainly consists of two parts, the first part is to prepare the dataset in your analytics engine, the second part is to create visualization in QuickSight.

### Part 1 - Dataset preparation

1. Open **Redshift Serverless dashboard**
2. Click the workgroup starting with `clickstream-<project-id>` created by the solution.
3. Click on the `Query data` button, you will be directed to the Redshift Query Editor.
4. In the `Editor` view on the Redshift Query Editor, right click on the workgroup with name of `clickstream-<project-id>`. In the prompted drop-down, select `Edit connection`, you will be asked to provide connection parameters. Follow this [guide](https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html){:target="_blank"} to use an appropriate method to connect.
   
    !!! note "Important"
        
        You will need read and write permissions for the database (with name as `<project-id>`) to create custom view or table. For example, you can use Admin user to connect to the cluster or workgroup. If you don't know the password for the Admin user, you can reset the admin password in the Redshift Console ([Learn more](https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-security.html){:target="_blank"}). 

5. If it is the first time you access the query editor, you will be prompted to configure the account, please click **Config account** button to open query editor.
6. Add a new SQL editor, and make sure you selected the correct workgroup and schema.
7. Create a new view for funnel analysis. In this example, we used below SQL.
  
    ??? SQL command
        ```sql
        CREATE OR REPLACE VIEW notepad.clickstream_funnel_view as
        SELECT
        platform,
        COUNT(DISTINCT step1_id) AS login_users,
        COUNT(DISTINCT step2_id) AS add_button_click_users,
        COUNT(DISTINCT step3_id) AS note_create_users
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
            notepad.ods_events
        LEFT JOIN (
        SELECT
            user_pseudo_id AS step2_id,
            event_timestamp AS step2_timestamp
        FROM
            notepad.ods_events
        WHERE
            event_name = 'add_button_click' )
        ON
            user_pseudo_id = step2_id
            AND event_timestamp < step2_timestamp
        LEFT JOIN (
        SELECT
            user_pseudo_id AS step3_id,
            event_timestamp AS step3_timestamp
        FROM
            notepad.ods_events
        WHERE
            event_name= 'note_create' )
        ON
            step3_id  = step2_id
            AND step2_timestamp < step3_timestamp
        WHERE
        event_name = 'user_login' )
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
      - **User name**: name of the user you used to created the custom view in previous steps
      - **Password**: password of the user you used to created the custom view in previous steps
10. Validated the connection, if ok, click **Create data source** button.
11. Choose the view from Redshift as data source - "**clickstream_funnel_view**", then
    - Schema: select `notepad` 
    - Tables: `clickstream_funnel_view`
    
    !!! note "note"
        
        You will be prompt to select `Import to SPICE` or `Directly query your data`, please select `Directly query your data`.

    - Click **Edit/Preview data** to preview the data, once you're familiar with the data, click  **PUBLISH & VISUALIZE** at the top-right.

### Part 2 - Create visulizations in QuickSight
   
1. You will be prompt to select a layout for your visualization, select one per your need.
2. Click "**+Add**" at the top-left of the screen then click "**Add visual**" button.
3. Select a Visual type at the bottom-left of the screen, in this example, select **Vertical bar chart**
4. In the Field wells, select `platform` as X axis, `login_user`, `add_button_click_users`, and `note_create_users` as Value.
5. You now can publish this analysis as dashboard or continue to format it. Learn more about QuickSight visualization in this [link](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html){:target="_blank"}