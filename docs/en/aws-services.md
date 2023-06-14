This section describes the components and AWS services that make up this solution and the architecture details on how these components work together.


## AWS services in this solution

The following AWS services are included in this solution:

| AWS service | Description |
| --- | --- |
| [Amazon Elastic Load Balancing][elb] | **Core**.  To distribute network traffic to ingestion fleet. |
| [Amazon ECS][ecs] | **Core**.  To run the ingestion module fleet. |
| [Amazon EC2][ec2] | **Core**. To provide the underlying computing resources for ingestion fleet. |
| [Amazon ECR][ecr] | **Core**. To host the container images used by ingestion fleet. |
| [Amazon S3][s3] | **Core**. To store the ingested and processed Clickstream data. And it also stores the service logs and static web assets (frontend user interface). |
| [AWS Global Accelerator][aga] | **Supporting**. To improve the availability, performance, and security of the ingestion service in AWS Regions. |
| [AWS CloudWatch][cloudwatch] | **Supporting**. To monitor the metrics, logs and trace of data pipeline. |
| [Amazon SNS][sns] | **Supporting**. To provide topic and email subscription notifications for the alarms of data pipeline. |
| [Amazon Kinesis Data Streams][kds] | **Supporting**. To provide the ingestion buffer. |
| [AWS Lambda][lambda] | **Supporting**. To integrate with kinds of AWS services. For example, sink ingestion data to S3, manage the lifecycle of AWS resources. |
| [Amazon Managed Streaming for Apache Kafka (MSK)][msk] | **Supporting**. To provide the ingestion buffer with Apache Kafka. |
| [Amazon EMR Serverless][emr-serverless] | **Supporting**. To process the ingested data. |
| [Amazon Glue][glue] | **Supporting**. To manage the data catalog of ingested data. |
| [Amazon EventBridge][eventbridge] | **Supporting**. To integrate with AWS services with events or schedule. |
| [Amazon Redshift][redshift] | **Supporting**. To analyze your Clickstream data in data warehouse. |
| [Amazon Athena][athena] | **Supporting**. To analyze your Clickstream data in data lake. |
| [AWS Step Functions][step-functions] | **Supporting**. To orchestrate the lifecycle management of project's pipeline. Also it manages the workflow to load data into data warehouse. |
| [AWS Secrets Manager][secrets-manager] | **Supporting**. To store the credential for OIDC credentials and BI user in Redshift. |
| [Amazon QuickSight][quicksight] | **Supporting**. Visual your analysis reporting of your Clickstream data. |
| [Amazon CloudFront][cloudfront] | **Supporting**. To made available the static web assets (frontend user interface) and proxy the backend in the same origin. |
| [Amazon Cognito][cognito] | **Supporting**. To authenticate users (in AWS Regions). |
| [Amazon API Gateway][api-gateway] | **Supporting**. To provide the backend APIs. |
| [Amazon DynamoDB][ddb] | **Supporting**.  To store projects data. |
| [AWS CloudFormation][cloudformation] | **Supporting**.  To provision the AWS resources for the modules of data pipeline. |

[cloudfront]: https://aws.amazon.com/cloudfront/
[api-gateway]: https://aws.amazon.com/api-gateway/
[lambda]: https://aws.amazon.com/lambda/
[ddb]: https://aws.amazon.com/dynamodb/
[ecs]: https://aws.amazon.com/ecs/
[ec2]: https://aws.amazon.com/ec2/
[s3]: https://aws.amazon.com/s3/
[elb]: https://aws.amazon.com/elasticloadbalancing/
[ecr]: https://aws.amazon.com/ecr/
[cloudwatch]: https://aws.amazon.com/cloudwatch/
[sns]: https://aws.amazon.com/sns/
[cognito]: https://aws.amazon.com/cognito/
[kds]: https://aws.amazon.com/kinesis/data-streams/
[msk]: https://aws.amazon.com/msk/
[emr-serverless]: https://aws.amazon.com/emr/serverless/
[glue]: https://aws.amazon.com/glue/
[eventbridge]: https://aws.amazon.com/eventbridge/
[redshift]: https://aws.amazon.com/redshift/
[athena]: https://aws.amazon.com/athena/
[step-functions]: https://aws.amazon.com/step-functions/
[secrets-manager]: https://aws.amazon.com/secrets-manager/
[aga]: https://aws.amazon.com/global-accelerator/
[quicksight]: https://aws.amazon.com/quicksight/
[cloudformation]: https://aws.amazon.com/cloudformation/
