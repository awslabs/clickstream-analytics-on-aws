# Frequently Asked Questions

## General

### What is {{ solution_name }}?

An AWS Solution that enables customers to build clickstream analytic system on AWS easily. This solution automates the data pipeline creation per customers' configurations with a visual pipeline builder, and provides SDKs for web and mobiles apps (including iOS, Android, and Web JS) to help customers to collect and ingest client-side data into the data pipeline on AWS. After data ingestion, the solution allows customers to further enrich and model the event data for business users to query, and provides built-in visualizations (e.g., acquisition, engagement, retention) to help them generate insights faster.

## Data pipeline

### How do I choose the Redshift type for data modeling?

If the data pipeline meets the below criteria, serverless Redshift is preferred.

- The data processing interval is equal to or larger than one hour.
- The reporting querying and other usage, such as ETL, is intensive for a few hours at most.
- Redshift is not used for streaming ingestion.
- The estimated cost is lower than the provisioned cluster.

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

## SDK

### Can I use other SDK to send data to the pipeline created by this solution

Yes, you can. The solution support users using third-party SDK to send data to the pipeline. Note that, if you want to enable data processing and modeling module when using a third-party SDK to send data, you will need to provide an transformation plugin to map third-party SDK's data structure to solution data schema. Please refer to [Custom plugin](./pipeline-mgmt/data-processing/configure-plugin.md) for more details.

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

## Pricing

### How will I be charged and billed for the use of this solution?

The solution is free to use, and you are responsible for the cost of AWS services used while running this solution. 
You pay only for what you use, and there are no minimum or setup fees. Refer to the [Cost](./plan-deployment/cost.md) section for detailed cost estimation. 

[monitoring-dashboard]: ./pipeline-mgmt/pipe-mgmt.md#monitoring-and-alarms