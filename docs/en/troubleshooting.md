The following help you to fix errors or problems that you might encounter when using {{ solution_name }}.

## Problem: Deployment failure due to "Invalid Logging Configuration: The CloudWatch Logs Resource Policy size was exceeded"

If you encounter a deployment failure due to creating CloudWatch log group with an error message like the one below,

> Cannot enable logging. Policy document length breaking Cloudwatch Logs Constraints, either < 1 or > 5120 (Service: AmazonApiGatewayV2; Status Code: 400; Error Code: BadRequestException; Request ID: xxx-yyy-zzz; Proxy: null)

**Resolution:**

[CloudWatch Logs resource policies are limited to 5120 characters][log-resource-policy-limit]. The remediation is merging or removing useless policies, then updating the resource policies of CloudWatch logs to reduce the number of policies.

Below is a sample command to reset resource policy of CloudWatch logs:

```bash
aws logs put-resource-policy --policy-name AWSLogDeliveryWrite20150319 \
--policy-document '
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AWSLogDeliveryWrite2",
      "Effect": "Allow",
      "Principal": {
        "Service": "delivery.logs.amazonaws.com"
      },
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
      ],
      "Condition": {
        "StringEquals": {
          "aws:SourceAccount": "<your AWS account id>"
        },
        "ArnLike": {
          "aws:SourceArn": "arn:aws:logs:<AWS region>:<your AWS account id>:*"
        }
      }
    }
  ]
}
'
```

## Problem: Can not delete the CloudFormation stacks created for the Clickstream pipeline

If you encounter a failure with an error message like the one below when deleting the CloudFormation stacks created for the Clickstream pipeline,

> Role arn:aws:iam::<your AWS account id\>:role/<stack nam\>-ClickStreamApiStackActionSta-<random suffix\> is invalid or cannot be assumed

**Resolution:**

It results from deleting the web console stack for this solution before the CloudFormation stacks are made for the Clickstream pipeline.

Please create a new IAM role with the identical name mentioned in the above error message and trust the CloudFormation service with sufficient permission to delete those stacks.

!!! tip "Tip"

    You can delete the IAM role after successfully removing those CloudFormation stacks.

[log-resource-policy-limit]: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AWS-logs-and-resource-policy.html#AWS-logs-infrastructure-CWL

## Problem: Can not sink data to MSK cluster, got "InvalidReplicationFactor (Broker: Invalid replication factor)" log in Ingestion Server

If you notice that data can not be sunk into S3 through MSK cluster, and the error message in log of Ingestion Server (ECS) worker task is as below:

> Message production error: InvalidReplicationFactor (Broker: Invalid replication factor)

**Resolution:**

This is caused by replication factor larger than available brokers, please edit the MSK cluster configuration, set **default.replication.factor** not larger than the total number of brokers.

## Problem: data processing job failure

If the data processing job implemented by EMR serverless fails with the below errors:

- IOException: No space left on device

    >Job failed, please check complete logs in configured logging destination. ExitCode: 1. Last few exceptions: Caused by: java.io.IOException: No space left on device Exception in thread "main" org.apache.spark.SparkException:

- ExecutorDeadException

    > Job failed, please check complete logs in configured logging destination. ExitCode: 1. Last few exceptions: Caused by: org.apache.spark.ExecutorDeadException: The relative remote executor(Id: 34), which maintains the block data to fetch is dead. org.apache.spark.shuffle.FetchFailedException Caused by: org.apache.spark.SparkException: Job aborted due to stage failure: ShuffleMapStage

- Could not find CoarseGrainedScheduler

    > Job failed, please check complete logs in configured logging destination. ExitCode: 1. Last few exceptions: org.apache.spark.SparkException: Could not find CoarseGrainedScheduler.

You need to tune the EMR job default configuration, and please refer to the [configure execution parameters](./pipeline-mgmt/data-processing/configure-execution-para.md#config-spark-job-parameters).

## Problem: Reporting stack(Clickstream-Reporting-xxx) deployment fail

If you found reporting stack deployment failed with message like 

> Connection attempt timed out

And it happened when creating DataSource(AWS::QuickSight::DataSource).

**Resolution:**

Login solution web console and click "Retry" button in pipeline detail information page