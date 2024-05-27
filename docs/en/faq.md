# Frequently Asked Questions

## General

### What is {{ solution_name }}?

An AWS Solution that enables customers to build clickstream analytic system on AWS easily. This solution automates the data pipeline creation per customers' configurations with a visual pipeline builder, and provides SDKs for web and mobiles apps (including iOS, Android, and Web JS) to help customers to collect and ingest client-side data into the data pipeline on AWS. After data ingestion, the solution allows customers to further enrich and model the event data for business users to query, and provides built-in visualizations (e.g., acquisition, engagement, retention) to help them generate insights faster.

## Pricing

### How will I be charged and billed for the use of this solution?

The solution is free to use, and you are responsible for the cost of AWS services used while running this solution. 
You pay only for what you use, and there are no minimum or setup fees. Refer to the [Cost](./plan-deployment/cost.md) section for detailed cost estimation. 

## Data pipeline

### When do I choose Redshift serverless for data modeling?

If the data pipeline meets the below criteria, Redshift serverless is preferred.

- The data processing interval is equal to or larger than one hour.
- The reporting querying and other usage, such as ETL, is intensive for a few hours at most.
- Redshift is not used for streaming ingestion.
- The estimated cost is lower than the provisioned cluster.

### I already enable data modeling on Redshift, why can't I see the schema and tables created by this solution in the Redshift query editor?

This solution creates a separate database and schema within your Amazon Redshift cluster for storing and processing clickstream events. By default, the schema, tables, and views are only owned by the user who created them and are not visible to other users who log into the Redshift [query editor][redshift-query-editor].

You could use the `superusers` or the `admin` of Redshift to view them.

- For provisioned Redshift, you could use `admin` or the **Database user** specified when configuring the data pipeline.
- For Redshift serverless, the schema and tables are created by an IAM role managed by the solution; there is no default password for this user. You could [edit admin credentials][redshift-secrets-manager-integration] for the Redshift serverless namespace.

Once you view the schema and tables in the query editor, you can [grant permissions][redshift-grant] to other Redshift users.

### How do I monitor the health of the data pipeline for my project?

You can open the built-in [observability dashboard][monitoring-dashboard] to view the key metrics of your data pipeline.

The dashboard displays metrics for different components of your data pipeline, including data ingestion, processing, and modeling.

- **Data Ingestion - Server**:
    - **Server Request Counts**: The total requests received by the ingestion servers in the given period. You can use it to calculate the request per second (RPS) of the ingestion servers.
    - **Server Response Time**: The average response time in seconds of the ingestion servers in the given period.
    - **Server(ECS) Tasks** The number of tasks/instances running for the ingestion servers.
- **Data Ingestion - Sink - Kinesis Data Stream** (available when enabling KDS as ingestion sink):
    - **Kinesis Throttled and Failed Records**: The total putting records of KDS were throttled or failed in the given period. The lower the value is, the better.
    - **Kinesis to S3 Lambda Error count**: The total error count in a given period when sinking records in KDS to S3. The lower the value is, the better.
    - **Kinesis to S3 Lambda success rate (%)**: The percentage of success rate of sinking KDS records to S3. The higher the value is, the better.
- **Data Processing** (available when enabling data processing):
    - **Data Processing Job success rate (%)**: The percentage of the success rate of a data processing job in a given period. The higher the value is, the better.
    - **Data Processing Row counts**: The chart contains four metrics: 
        - **source count**: The raw request count of the ingestion server received in the batch data processing.
        - **flatted source count**: The SDK sends the multiple clickstream events in a request in batch. It's the total clickstream events in the processed `source requests`.
        - **sink count**: The total valid clickstream events are transformed and enriched in data processing, and sink to S3 again.
        - **corrupted count**: The total invalid or unprocessable events in the data processing batch. You can check the corrupted file log in the bucket with path `clickstream/<project id>/data/pipeline-temp/<project id>/job-data/etl_corrupted_json_data/jobName=<emr serverless run job id>/` configured for your data pipeline.
- **Data Modeling** (available when enabling data modeling on Redshift):
    - **'Load data to Redshift tables' workflow**: The success or fail count of the workflow loading processed data into Redshift in the given period.
    - **File max-age**: The maximum age of processed files located in S3 is not loaded to Redshift. There is a built-in alarm that will be triggered when the max-age exceeds the data processing interval.
    - **Redshift-Serverless ComputeCapacity** (available when using Redshift serverless): The RPU usage of the Redshift serverless workgroup. If the used RPU count always reaches the maximum RPU number of the Redshift serverless, it means there are insufficient compute resources for the workload in Redshift.

### How do I re-run a failed data processing job?

Occasionally, the data processing job fails. You can re-run the failed job to reprocess the data in that given period. The steps are:

1. Open the failed job in **EMR Studio** - **Applications** - **Clickstream-<project id\>**.
2. Click the **Clone** action.
3. Keep all parameters unchanged, then click the **Submit job run** button.

### How do I resume a failed data-loading workflow?

This solution uses a workflow named `ClickstreamLoadDataWorkflow`, orchestrated by Step Functions to load the processed data into Redshift. The workflow uses a DynamoDB table to record the files to be loaded that are processed by the data processing job. Any failure won't lose any data for loading into Redshift. It's safe to execute the workflow again to resume the loading workflow after it fails.

### How do I recalculate historical events for out-of-the-box dashboards?

The metrics in the out-of-the-box dashboards are calculated on a daily basis. If you need to recalculate the metrics in case of there are changes to your historical data, you could manually reschedule the workflow to re-calculate the metrics. Follow these steps:

1. Open the Step Functions service in the AWS console for the region where your data pipeline is located.
1. Find the state machine named **RefreshMaterializedViewsWorkflowRefreshMVStateMachine**. If you have multiple projects in the same region, check the tags of the state machine to ensure it belongs to the project for which you want to recalculate the metrics.
1. Start a new execution with the following input JSON. You need to change the 
`refreshStartTime` and `refreshEndTime` values to the date range for the data you want to recalculate.
```json
{
"refreshEndTime": 1715406892000,
"refreshStartTime": 1711929600000
}
```

## Analytics Studio

### Why is the Analytics Studio is not available?

The reason for this prompt is due to the following two situations:

- The version of the pipeline is not v1.1 or higher. You can try upgrading the pipeline and wait for the upgrade to complete before trying again.
- The reporting module is not enabled on the pipeline.

### How can I modify the default dashboard?

You are not allowed to modify the default dashboard directly, however, you can create a new analysis from the default dashboard and then create a new dashboard from the analysis that you copied. Below are the steps to create analysis from the default dashboard: 

1. In Analytics Studio, open Analyzes module, then click "Dashboards".
2. Open the default dashboard with name of "Clickstream Dashboard - <app-id> - <project-id>"
3. Click the "Share" icon and click "Share Dashboard" at upper right.
4. In the new window, turn on Allow "save as" in the Save as Analysis column for "ClickstreamPublishUser" (scroll the window to the right if you don't see the column).
5. Go back to the Dashboard, refresh the webpage, you should be able to see the Save As button at the upper right.
6. Click Save as button, enter a name for the analysis, and click SAVE, now you should be able to see a new analysis in the Analyzes, with which now you can edit and publish a new dashboard.

### How to speed up the loading of the default dashboard?

You can accelerate report loading by converting QuickSight datasets to SPICE mode. Here are the steps to do this:

1. Purchase SPICE capacity through the QuickSight console. The required capacity depends on your data volume; it is recommended to enable the auto-purchase option.
2. Open the solution console, select the target project, click the pipeline **Active** status on the pipeline details page, and then open the stack detail link of **Reporting** in the CloudFormation console.
3. Click the **Update** button and select the **Use existing template** option.
4. Find the **Enable QuickSight SPICE Import Mode** parameter and change its value to **yes**. Keep other parameters unchanged.
5. Click next to complete the stack update. Once the update is complete, you can start using it.

!!! info "Important"

    1. Enabling SPICE will result in charges based on the amount of space used. Pricing details can be found in the QuickSight pricing page. If the dashboard is frequently viewed, enabling SPICE can reduce the access load on the Redshift database, but it may also increase data latency.
    2. By default, the solution refreshes data in SPICE using an incremental update method. The refresh process is scheduled at 6 AM daily in your dashboard's time zone. You can manually adjust the update schedule in QuickSight.


### How to implement a dedicated Redshift for Analytics Studio?

Redshift supports [sharing data across different Redshift clusters][redshift-share-data], allowing you to use a dedicated Redshift cluster for Analytics Studio to achieve better query performance and cost optimization.

Before implementing Amazon Redshift data sharing, please note the following:

- You can share data between the same cluster types, as well as between provisioned clusters and serverless clusters.
- Only **Ra3** type clusters and **Redshift serverless** support data sharing.

Taking Redshift serverless as an example of data sharing, follow these operational steps:

1. [Create a Redshift serverless][serverless-console-workflows] as the data consumer.
2. Run SQL in the producer Redshift database (The project database configured in the Clickstream solution) to create a data share and grant consumer permissions:
    ```sql
    -- Create Data sharing

    CREATE DATASHARE <data share name> SET PUBLICACCESSIBLE FALSE;
    ALTER DATASHARE <data share name> ADD SCHEMA <schema>;
    ALTER DATASHARE <data share name> ADD ALL TABLES IN SCHEMA <schema>;

    -- Grant the Data sharing to the consumer Redshift.

    GRANT USAGE ON DATASHARE <data share name> TO NAMESPACE '<consumer namespace id>';
    ```
    Replace `<data share name>` with the name you want to share, `<schema>` with the schema you want to share, and `<consumer namespace id>` with the consumer Redshift serverless namespace ID.
3. Run SQL in the consumer Redshift database:
    ```sql
    -- Create database 

    CREATE DATABASE <new database name> WITH PERMISSIONS FROM DATASHARE <data share name> OF NAMESPACE '<source namespace id>';
   
    -- Create bi user
    
    CREATE USER bi_user PASSWORD '<strong password>';
    GRANT USAGE ON DATABASE "<new database name>" TO bi_user;
    GRANT USAGE ON SCHEMA "<new database name>"."<schema>" TO bi_user;
    GRANT SELECT ON ALL TABLES IN SCHEMA "<new database name>"."<schema>" TO bi_user;

    -- Grant permission to data api role
    CREATE USER "IAMR:<data api role name>" PASSWORD DISABLE;
    GRANT USAGE ON DATABASE "<new database name>" TO "IAMR:<data api role name>";
    GRANT USAGE ON SCHEMA "<new database name>"."<schema>" TO "IAMR:<data api role name>";
    GRANT SELECT ON ALL TABLES IN SCHEMA "<new database name>"."<schema>" TO "IAMR:<data api role name>";

    -- Test bi_user permission (optional)
    SET SESSION AUTHORIZATION bi_user;
    SELECT CURRENT_USER;
    SELECT * FROM "<new database name>"."<schema>"."event_v2" limit 1;
    ```
    Replace `<new database name>` with the database name in the consumer Redshift (it can be different from the original database name), replace `<source namespace id>` with the producer Redshift serverless namespace ID, and replace `<data api role name>` with the name of Data Api Role, which can be obtained from the output **RedshiftDataApiRoleArn** of the Reporting stack.
4. Create a new secret for the BI user in Secrets Manager, specifying the value as plaintext like below:
   ```json
   {"username":"bi_user","password":"<strong password>"}
   ```
   The **key name** should be like: `/clickstream/reporting/user/bi_user`.
5. Go to Cloudformation in AWS console, update the reporting stack to use the consumer Redshift:
    - **Redshift Endpoint Url** (Required): Consumer Redshift access endpoint
    - **Redshift Default database name** (Required): `dev`
    - **Redshift Database Name** (Required): `<new database name>`
    - **Parameter Key Name** (Required): `<key name>`
    - Comma Delimited Security Group Ids (Optional): The security group for VPC connection to access Redshift
    - Comma Delimited Subnet Ids (Optional): The subnet IDs for the consumer Redshift

## SDK

### Can I use other SDK to send data to the pipeline created by this solution

Yes, you can. The solution support users using third-party SDK to send data to the pipeline. Note that, if you want to enable data processing and modeling module when using a third-party SDK to send data, you will need to provide a transformation plugin to map third-party SDK's data structure to solution data schema. Please refer to [Custom plugin](./pipeline-mgmt/data-processing/configure-plugin.md) for more details.

[monitoring-dashboard]: ./pipeline-mgmt/pipe-mgmt.md#monitoring-and-alarms
[redshift-query-editor]: https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html
[redshift-secrets-manager-integration]: https://docs.aws.amazon.com/redshift/latest/mgmt/redshift-secrets-manager-integration.html
[redshift-grant]: https://docs.aws.amazon.com/redshift/latest/dg/r_GRANT.html
[serverless-console-workflows]: https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-console-workflows.html
[redshift-share-data]: https://docs.aws.amazon.com/redshift/latest/dg/datashare-overview.html
