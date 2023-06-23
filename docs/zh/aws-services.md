本节介绍构成此解决方案的组件和云服务，以及有关这些组件如何协同工作的架构详细信息。


## 此解决方案中的云服务

此解决方案包含以下云服务：

| 云服务 | 描述 |
| --- | --- |
| [Amazon Elastic Load Balancing][elb] | **核心**。  负责将网络流量分配到摄取服务器集群。 |
| [Amazon ECS][ecs] | **核心**。  负责运行摄取服务器。 |
| [Amazon EC2][ec2] | **核心**。 为摄取服务器提供底层计算资源。 |
| [Amazon ECR][ecr] | **核心**。 托管摄取服务器使用的容器镜像。 |
| [Amazon S3][s3] | **核心**。 用于存储已摄取和处理的点击流数据。它还用于存储服务日志和静态网站资产（解决方案控制台用户界面）。 |
| [AWS Global Accelerator][aga] | **支持**。 提高摄取服务在各区域中的可用性、性能和安全性。 |
| [AWS CloudWatch][cloudwatch] | **支持**。 监控数据管道的指标、日志和跟踪。 |
| [Amazon SNS][sns] | **支持**。 为数据管道警报提供主题和电子邮件订阅通知。 |
| [Amazon Kinesis Data Streams][kds] | **支持**。 提供摄取缓冲区。 |
| [AWS Lambda][lambda] | **支持**。 与各云服务集成。例如，将摄取数据接收到 S3和管理 AWS 资源的生命周期。 |
| [Amazon Managed Streaming for Apache Kafka (MSK)][msk] | **支持**。 为摄取缓冲区提供 Apache Kafka。 |
| [Amazon EMR Serverless][emr-serverless] | **支持**。 处理摄取的数据。 |
| [Amazon Glue][glue] | **支持**。 管理已摄取数据的元数据目录。 |
| [Amazon EventBridge][eventbridge] | **支持**。 通过触发事件或定时事件与云服务集成。 |
| [Amazon Redshift][redshift] | **支持**。 分析数据仓库中的点击流数据。 |
| [Amazon Athena][athena] | **支持**。 在数据湖中分析您的点击流数据。 |
| [AWS Step Functions][step-functions] | **支持**。 编排项目管道的生命周期管理。 此外，它还管理将数据加载到数据仓库的工作流程。 |
| [AWS Secrets Manager][secrets-manager] | **支持**。 存储 OIDC 凭证和存储商业智能用户访问 Redshift 的凭证。 |
| [Amazon QuickSight][quicksight] | **支持**。 可视化您的点击流数据分析报表。 |
| [Amazon CloudFront][cloudfront] | **支持**。 为静态网站资产（解决方案控制台用户界面）和控制台应用程序接口提供统一代理。 |
| [Amazon Cognito][cognito] | **支持**。 对用户进行身份验证。 |
| [Amazon API Gateway][api-gateway] | **支持**。 为解决方案控制台提供后端应用程序接口。 |
| [Amazon DynamoDB][ddb] | **支持**。  用于存储解决方案控制台管理相关数据。 |
| [AWS CloudFormation][cloudformation] | **支持**。  为数据管道模块配置云服务资源。 |

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
