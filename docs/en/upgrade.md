# Upgrade the solution

## Planning and Preparation

1. **Data Processing interval**: The pipeline upgrade will take about 20 minutes; ensure no data processing job is running while upgrading the existing pipeline. You can update the existing pipeline to increase the interval and view whether there are running jobs of the EMR Serverless application in the console.

## Upgrade Process

### Upgrade web console stack

1. Log in to [AWS CloudFormation console][cloudformation], select your existing [web console stack][console-stack], and choose **Update**.
2. Select **Replace current template**.
3. Under **Specify template**:
    - Select Amazon S3 URL.
    - Copy the link of the latest template based on your deployment type.
    - Paste the link in the Amazon S3 URL box.
    - Choose **Next** again.
4. Under **Parameters**, review the parameters for the template and modify them as necessary. Refer to [Deployment][console-stack] for details about the parameters.
5. Choose **Next**.
6. On the **Configure stack options** page, choose **Next**.
7. On the **Review** page, review and confirm the settings. Be sure to check the box acknowledging that the template might create (IAM) resources.
8. Choose **View change set** and verify the changes.
9. Choose **Execute change set** to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive an `UPDATE_COMPLETE` status after a few minutes.

### Upgrade the pipeline of project

1. Log in to the web console of the solution.
2. Verify the solution version at the right-bottom of the page starting with `v1.1.0`. If not, you can force reload the page to recheck it.
3. Go to **Projects**, and choose the project to be upgraded.
4. Click on `project id` or **View Details** button, which will direct to the pipeline detail page.
5. In the project details page, click on the **Upgrade** button
6. You will be prompted to confirm the upgrade action.
7. Click on **Confirm**, the pipeline will be in `Updating` status.

You can view the status of the pipeline in the solution console in the **Status** column. You should receive an `Active` status after a few minutes.

## Post-Upgrade Actions

### Migrate the existing data after upgrading from 1.0.x

When you upgraded the pipeline from v1.0.x, you need to perform the below actions to migrate data from old table `ods_events` to new tables `event`, `event_parameter`, `user`, and `item` in the Redshift:

1. Open [Redshift query editor v2][query-editor]. You can refer to AWS doc [Working with query editor v2][working-with-query-editor] to log in and query data using Redshift query editor v2.

    !!! info "Note"
        You must use the `admin` user or the user with schema (known as the app ID) ownership permission.

2. Select the Serverless workgroup or provisioned cluster, `<project-id>`->`<app-id>`->Tables, and make sure tables for the appId are listed there.

3. Create a new SQL Editor。

4. Execute below SQL in editor.

    ```sql
    -- please replace `<app-id>` with your actual app id
    CALL "<app-id>".sp_migrate_ods_events_1_0_to_1_1();
    ```

5. Wait for the SQL to complete. The execution time depends on the volume of data in table `ods_events`.

6. Execute the below SQL to check the stored procedure execution log; make sure there are no errors there.

    ```sql 
    -- please replace `<app-id>` with your actual app id
    SELECT * FROM  "<app-id>"."clickstream_log" where log_name = 'sp_migrate_ods_events' order by log_date desc;
    ```

7. If you don't have other applications using the legacy tables and views, you could run the SQLs below to clean the legacy views and tables to save the storage of Redshift.

    ```sql 
    -- please replace `<app-id>` with your actual app id
    ```

[cloudformation]: https://console.aws.amazon.com/cloudfromation/
[console-stack]: ./deployment/index.md
[query-editor]: https://aws.amazon.com/redshift/query-editor-v2/
[working-with-query-editor]: https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html
