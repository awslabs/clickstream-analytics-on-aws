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

## 问题: 报表堆栈(Clickstream-Reporting-xxx) 部署失败

如果报表堆栈部署失败并有如下所示的错误消息

> Connection attempt timed out

并且发生在CloudFormation试图创建数据源(AWS::QuickSight::DataSource)的过程中。

**解决方法：**

登录解决方案控制台，在管道详情页点击"重试"按钮。

## 问题: Clickstream-DataModelingRedshift-xxxxx 堆栈更新失败，状态显示为 UPDATE_ROLLBACK_FAILED

从 1.0.x 升级到最新版本时, 如果 CloudFormation 堆栈 `Clickstream-DataModelingRedshift-xxxxx` 的状态显示为 `UPDATE_ROLLBACK_FAILED`，您需要按照以下步骤手动修复。

**解决方法：**

1. 在 CloudFormation 的 **资源** 选项卡中，找到逻辑 ID 为 `CreateApplicationSchemasCreateSchemaForApplicationsFn` 的 Lambda 函数名称。

2. 在下面的脚本中更新函数名称，并在 shell 终端中执行该脚本（您必须已安装并配置了 AWS CLI）：

    ```sh
    aws_region=<us-east-1> # replace this with your AWS region, and remove '<', '>'
    fn_name=<fn_name_to_replace> # replace this with actual function name in step 1 and remove '<', '>'
    
    cat <<END | > ./index.mjs
    export const handler = async (event) => {
      console.log('No ops!')
      const response = {
        Status: 'SUCCESS',
        Data: {
          DatabaseName: '',
          RedshiftBIUsername: ''
        }
      };
      return response;
    };
    
    END
    
    rm ./noops-lambda.zip > /dev/null 2>&1
    zip ./noops-lambda.zip ./index.mjs
    
    aws lambda update-function-code --function-name ${fn_name} \
     --zip-file fileb://./noops-lambda.zip \
     --region ${aws_region} | tee /dev/null
    ```

3. 在 CloudFormation Web 控制台中，选择 **堆栈操作** -> **继续更新回滚**。

4. 等待堆栈状态变为 **UPDATE_ROLLBACK_COMPLETE**。

5. 从解决方案 Web 控制台中重试升级。

## 问题：无法将数据摄取到 MSK 集群，Ingestion Server日志为“InvalidReplicationFactor (Broker: Invalid replication factor)”

如果发现数据无法通过MSK集群存储到S3中，Ingestion Server (ECS) worker task日志中的报错信息如下：

> Message production error: InvalidReplicationFactor (Broker: Invalid replication factor)

**解决方法：**

这是因为replication factor 大于brokers总数造成的，请编辑 MSK 集群配置，设置 **default.replication.factor** 不大于brokers总数。

## 问题：数据处理作业失败

如果运行在 EMR Serverless 的数据处理作业失败并出现以下错误：

- IOException: No space left on device

    >Job failed, please check complete logs in configured logging destination. ExitCode: 1. Last few exceptions: Caused by: java.io.IOException: No space left on device Exception in thread "main" org.apache.spark.SparkException:

- ExecutorDeadException

    > Job failed, please check complete logs in configured logging destination. ExitCode: 1. Last few exceptions: Caused by: org.apache.spark.ExecutorDeadException: The relative remote executor(Id: 34), which maintains the block data to fetch is dead. org.apache.spark.shuffle.FetchFailedException Caused by: org.apache.spark.SparkException: Job aborted due to stage failure: ShuffleMapStage

- Could not find CoarseGrainedScheduler

    > Job failed, please check complete logs in configured logging destination. ExitCode: 1. Last few exceptions: org.apache.spark.SparkException: Could not find CoarseGrainedScheduler.

**解决方法：**

您需要调整EMR作业默认配置，请参考[配置执行参数](./pipeline-mgmt/data-processing/configure-execution-para.md#spark)。

## 问题：数据加载工作流由于单个执行历史记录中的事件数量达到 25,000 的限制而失败

这是由要加载的数据量过大或 Redshift 加载量非常高导致的。

**解决方法：**

您可以通过以下方式缓解此错误：

增加 Redshift 的计算资源（例如，Redshift Serverless 的 RPU）或者减少[数据处理间隔][data-processing-param]。然后，[重新启动数据加载工作流][restart-loading-workflow]。

## 问题: 在分析工作坊查看仪表板时，收到错误"Your database generated a SQL exception. This can be caused by query timeouts, resource constraints, unexpected DDL alterations before or during a query, and other database errors."

仪表板可能正在使用尚未在 Redshift 中就绪的视图或物化视图。本解决方案在创建或更新项目的管道时异步创建或更新仪表板使用的视图和物化视图。创建或更新的持续时间取决于 Redshift 集群的工作负载、已有数据量，完成更新可能需要几分钟到几小时。您可以在管道详情页面的**数据处理和建模**选项卡中的 **Redshift Schemas** 部分跟踪进度。如果后期配置作业失败，您可以通过其链接访问工作流的执行，并通过**操作 - 重启**或**新执行**(输入保持不变)来重新运行作业。

## 问题: 在创建启用数据处理的数据管道时，数据处理 CloudFormation 堆栈遇到了错误 "The availability zones for subnets [subnet-xyz] are currently not supported."。

这是因为处理点击流数据的 EMR 无服务器应用程序无法部署在上述错误消息中指定的私有子网中。

**解决方法:**

请在 EMR 无服务器支持的可用区域中重新创建包含私有子网的项目。您可以参考[此文档][emr-serverless-endpoints]来检查部署区域中 EMR 无服务器支持的可用区域。

[log-resource-policy-limit]: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AWS-logs-and-resource-policy.html#AWS-logs-infrastructure-CWL
[data-processing-param]: ./pipeline-mgmt/data-processing/configure-execution-para.md#_2
[restart-loading-workflow]: ./faq.md#_7
[emr-serverless-endpoints]: https://docs.aws.amazon.com/zh_cn/emr/latest/EMR-Serverless-UserGuide/endpoints-quotas.html#endpoints
