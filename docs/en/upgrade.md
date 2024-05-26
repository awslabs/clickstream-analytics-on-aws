# Upgrade the solution

!!! warning "Important"

    1. Please be advised that upgrading directly from version 1.0.x to 1.1.6(+) version is not supported. It is necessary to upgrade to [version 1.1.5][v115] first.
    2. By upgrading the web console from earlier 1.1 versions before 1.1.6, you could continue to view the dashboards of the project. However, you could not [explore the existing Clickstream data][exploration] due the changes of data schemas. If you wish to continue to use the Explorations, you will need to upgrade the data pipeline as well and migrate the existing data to new data schemas (if you want to explore historical data).

## Planning and Preparation

1. **Data Processing Interval** (only applicable when upgrading from a version earlier than v1.1.6 and data processing enabled): The data schema has been updated since version 1.1.6. Ensure no data processing job is running while upgrading the existing pipeline. The pipeline upgrade will take approximately 20 minutes. You can update the existing pipeline to increase the interval and check if there are any running jobs of the EMR Serverless application in the console.

## Upgrade Process

### Upgrade web console stack

1. Log in to [AWS CloudFormation console][cloudformation], select your existing [web console stack][console-stack], and choose **Update**.
2. Select **Replace current template**.
3. Under **Specify template**:
    - Select Amazon S3 URL.
    - Refer to the table below to find the link for your deployment type.
    - Paste the link in the Amazon S3 URL box.
    - Choose **Next** again.

    | Template      | Description                          |
    | :---------- | :----------------------------------- |
    | [Use Cognito for authentication][cloudfront-s3-template]     | Deploy as public service in AWS regions  |
    | [Use Cognito for authentication with custom domain][cloudfront-s3-custom-domain-template]     | Deploy as public service with custom domain in AWS regions  |
    | [Use OIDC for authentication][cloudfront-s3-oidc-template]   | Deploy as public service in AWS regions  |
    | [Use OIDC for authentication with custom domain][cloudfront-s3-oidc-custom-domain-template]    | Deploy as public service with custom domain in AWS regions  |
    | [Use OIDC for authentication within VPC][intranet-template]   | Deploy as private service within VPC in AWS regions  |
    | [Use OIDC for authentication with custom domain in AWS China][cloudfront-s3-oidc-cn-template]    | Deploy as public service with custom domain in AWS China regions  |
    | [Use OIDC for authentication within VPC in AWS China][intranet-cn-template]   | Deploy as private service within VPC in AWS China regions  |

4. Under **Parameters**, review the parameters for the template and modify them as necessary. Refer to [Deployment][console-stack] for details about the parameters.
5. Choose **Next**.
6. On the **Configure stack options** page, choose **Next**.
7. On the **Review** page, review and confirm the settings. Be sure to check the box acknowledging that the template might create (IAM) resources.
8. Choose **View change set** and verify the changes.
9. Choose **Execute change set** to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive an `UPDATE_COMPLETE` status after a few minutes.

### Upgrade the Project Pipeline

!!! info "Important"

    If you encounter any issues during the upgrade process, refer to [Troubleshooting][troubleshooting] for more information.

1. Log in to the web console of the solution.
2. Go to **Projects**, and choose the project to be upgraded.
3. Click on `project id` or **View Details** button, which will direct to the pipeline detail page.
4. In the project details page, click on the **Upgrade** button
5. You will be prompted to confirm the upgrade action.
6. Click on **Confirm**, the pipeline will be in `Updating` status.

You can view the status of the pipeline in the solution console in the **Status** column. After a few minutes, you can receive an Active status.

## Post-Upgrade Actions (only applicable to data modeling enabled)

### Upgrade the Data Schema and Out-of-the-box Dashboards

The solution automatically and asynchronously upgrades the views and materialized views used by the dashboard after upgrading the pipeline of the project. The duration of the update depends on the workload of the Redshift cluster and the existing data volume, and can take minutes to hours. You can track the progress in the **Redshift Schemas** section in the **Processing** tab of the Pipeline Detail page. If the post-configuration job fails, you can access the execution of the workflow through its link and rerun the job via **Actions - Redrive** or **New execution** with the input unchanged.

### Migrate the Existing Data (only applicable when upgrading from a version earlier than v1.1.6)

!!! info "Important"

    The data migration process is CPU-intensive. Before starting the migration, ensure that the load on your Redshift is low. It's also advisable to consider temporarily increasing the RPUs of Redshift Serverless or the cluster size when migrating large volumes of data.

    In our benchmark, we migrated 100 million events in 25 minutes using 32 RPUs of Redshift Serverless.

1. Open [Redshift query editor v2][query-editor]. You can refer to the AWS document [Working with query editor v2][working-with-query-editor] to log in and query data using Redshift query editor v2.

    !!! info "Note"
        You must use the `admin` user or a user with schema (known as the app ID) ownership permission. See this [FAQ][view-schema-in-redshift] for more details.

2. Select the Serverless workgroup or provisioned cluster, `<project-id>`->`<app-id>`->Tables, and ensure that tables for the appId are listed there.

3. Create a new SQL Editor, select your project's schema.

4. Customize the date range as desired, and execute the following SQL in the editor to migrate events from the past 180 days, or any number of days up to the present, to the new tables.

    ```sql
    -- please replace <app-id> with your actual app id
    -- update the day range(180 days in below example) based on your needs
    CALL "<app-id>".sp_migrate_data_to_v2(180);
    ```

5. Wait for the SQL to complete. The execution time depends on the volume of data in the `events` table.

6. Execute the following SQL to check the stored procedure execution log; ensure there are no errors. If there are any interruptions, timeouts, or other errors, you can re-execute step 4 to continue the data migration.

    ```sql
    -- please replace <app-id> with your actual app id
    SELECT * FROM "<app-id>"."clickstream_log_v2" WHERE log_name = 'sp_migrate_event_to_v2' ORDER BY log_date DESC;
    SELECT * FROM "<app-id>"."clickstream_log_v2" WHERE log_name = 'sp_migrate_user_to_v2' ORDER BY log_date DESC;
    SELECT * FROM "<app-id>"."clickstream_log_v2" WHERE log_name = 'sp_migrate_item_to_v2' ORDER BY log_date DESC;
    SELECT * FROM "<app-id>"."clickstream_log_v2" WHERE log_name = 'sp_migrate_session_to_v2' ORDER BY log_date DESC;
    SELECT * FROM "<app-id>"."clickstream_log_v2" WHERE log_name = 'sp_migrate_data_to_v2' ORDER BY log_date DESC;
    ```

7. populate the event data to `clickstream_event_base_view` table.

    ```sql
    -- please replace <app-id> with your actual app id
    -- update the day range(180 days in below example) based on your needs
    CALL "<app-id>".clickstream_event_base_view_sp(NULL, NULL, 24*180);
    ```

    !!! info "Note"

        It is recommended to refresh the `clickstream_event_base_view` in batches, especially in the following scenarios:

        - When there are new event load jobs coming in before the migration job completes.
        - When the volume of migrated data is large (e.g., 100 millions in a batch).
        
        Noe that refreshing the data in batches needs to be done based on the event timestamp. Call the following stored procedure multiple times, in order from old to new event timestamps.
        ```sql
        call "<schema>".clickstream_event_base_view(start_event_timestamp, end_event_timestamp, 1);
        ```
        For example, to refresh data between 2024-05-10 00:00:00 and 2024-05-12 00:00:00, execute the following SQL:
        ```sql
        call "<schema>".clickstream_event_base_view_sp(TIMESTAMP 'epoch' + 1715270400  * INTERVAL '1 second', TIMESTAMP 'epoch' + 1715443200 * INTERVAL '1 second', 1);
        ```

8. Follow [this guide][faq-recalculate-data] to calculate metrics for the new preset dashboard based on the migrated data.

9. If you don't have other applications using the legacy tables and views, you could run the following SQL to clean up the legacy views and tables to save Redshift storage.

    ```sql
    -- please replace `<app-id>` with your actual app id
    DROP TABLE "<app-id>".event CASCADE;
    DROP TABLE "<app-id>".item CASCADE;
    DROP TABLE "<app-id>".user CASCADE;
    DROP TABLE "<app-id>".event_parameter CASCADE;

    DROP PROCEDURE "<app-id>".sp_migrate_event_to_v2(nday integer);
    DROP PROCEDURE "<app-id>".sp_migrate_item_to_v2(nday integer);
    DROP PROCEDURE "<app-id>".sp_clear_expired_events(retention_range_days integer);
    DROP PROCEDURE "<app-id>".sp_migrate_data_to_v2(nday integer);
    DROP PROCEDURE "<app-id>".sp_migrate_user_to_v2();
    DROP PROCEDURE "<app-id>".sp_migrate_session_to_v2();
    DROP PROCEDURE "<app-id>".sp_clear_item_and_user();
    ```

[cloudformation]: https://console.aws.amazon.com/cloudfromation/
[console-stack]: ./deployment/index.md
[query-editor]: https://aws.amazon.com/redshift/query-editor-v2/
[working-with-query-editor]: https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html
[cloudfront-s3-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global.template.json
[cloudfront-s3-custom-domain-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-customdomain.template.json
[cloudfront-s3-oidc-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-oidc.template.json
[cloudfront-s3-oidc-custom-domain-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-customdomain-oidc.template.json
[cloudfront-s3-oidc-cn-template]: https://{{ aws_cn_bucket }}.s3.cn-north-1.amazonaws.com.cn/{{ aws_cn_prefix }}/{{ aws_cn_version }}/cloudfront-s3-control-plane-stack-cn.template.json
[intranet-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/private-exist-vpc-control-plane-stack.template.json
[intranet-cn-template]: https://{{ aws_cn_bucket }}.s3.cn-north-1.amazonaws.com.cn/{{ aws_cn_prefix }}/{{ aws_cn_version }}/private-exist-vpc-control-plane-stack.template.json
[troubleshooting]: ./troubleshooting.md
[v115]: https://awslabs.github.io/clickstream-analytics-on-aws/en/1.1.5/upgrade/
[exploration]: ./analytics/explore/index.md
[view-schema-in-redshift]: ./faq.md#i-already-enable-data-modeling-on-redshift-so-why-cant-i-see-the-schema-and-tables-created-by-this-solution-in-the-redshift-query-editor
[faq-recalculate-data]: ./faq.md#how-do-i-recalculate-historical-events-for-out-of-the-box-dashboards
