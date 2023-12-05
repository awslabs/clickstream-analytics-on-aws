以下内容可帮助您修复使用 {{ solution_name }} 时可能遇到的错误或问题。

## 问题：由于“Invalid Logging Configuration: The CloudWatch Logs Resource Policy size was exceeded”而导致部署失败

如果您因创建 CloudWatch 日志组而遇到部署失败并显示如下错误消息：

> Cannot enable logging. Policy document length breaking Cloudwatch Logs Constraints, either < 1 or > 5120 (Service: AmazonApiGatewayV2; Status Code: 400; Error Code: BadRequestException; Request ID: xxx-yyy-zzz; Proxy: null)

**解决方法：**

[CloudWatch Logs 资源策略限制为 5120 个字符][log-resource-policy-limit]。 修复方法是：合并或删除无用的策略，然后更新 CloudWatch 日志的资源策略以减少策略的数量。

以下是重置 CloudWatch 日志资源策略的示例命令：

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

## 问题：无法删除为 Clickstream 数据管道创建的 CloudFormation 堆栈

如果您在删除为 Clickstream 管道创建的 CloudFormation 堆栈时遇到如下所示的错误消息：

> Role arn:aws:iam::<your AWS account id\>:role/<stack nam\>-ClickStreamApiStackActionSta-<random suffix\> is invalid or cannot be assumed

**解决方法：**

这是由于在为 Clickstream 数据管道创建 CloudFormation 堆栈之前删除了该解决方案的 Web 控制台堆栈。

请使用上述错误消息中提到的相同名称创建一个新的 IAM 角色，并信任具有足够权限的 CloudFormation 服务以删除这些堆栈。

!!! tip "提示"

    成功移除这些 CloudFormation 堆栈后，您可以删除 IAM 角色。

[log-resource-policy-limit]: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AWS-logs-and-resource-policy.html#AWS-logs-infrastructure-CWL

## 问题：无法将数据摄取到 MSK 集群，Ingestion Server日志为“InvalidReplicationFactor (Broker: Invalid replication factor)”

如果发现数据无法通过MSK集群存储到S3中，Ingestion Server (ECS) worker task日志中的报错信息如下：

> Message production error: InvalidReplicationFactor (Broker: Invalid replication factor)

**解决方法：**

这是因为replication factor 大于brokers总数造成的，请编辑 MSK 集群配置，设置 **default.replication.factor** 不大于brokers总数。

## 问题: 报表堆栈(Clickstream-Reporting-xxx) 部署失败

如果报表堆栈部署失败并有如下所示的错误消息

> Connection attempt timed out

并且发生在CloudFormation试图创建数据源的过程中(AWS::QuickSight::DataSource)

**解决方法：**

登录解决方案控制台，在管道详情页点击"重试"按钮