# 配置执行参数
执行参数控制如何编排转换和增强作业。

## 参数
在您切换开启 **启用数据处理** 后，您可以配置以下的 **执行参数**。

| 参数 | 描述 | 值 |
| --- | --- | --- |
| 数据处理间隔/固定频率 | 通过固定频率指定批处理数据进行 ETL 处理的间隔 | 1 小时 </br>12 小时</br>1 天 |
| 数据处理间隔/Cron 表达式 | 通过 cron 表达式指定批处理数据进行 ETL 处理的间隔 | `cron(0 * * ? *)` </br>`cron(0 0,12 * ? *)`</br>`cron(0 0 * ? *)` |
| 事件新鲜度 | 指定解决方案将忽略事件数据的天数。例如，如果您为此参数指定了3天，那么解决方案将忽略任何在事件触发后超过3天到达的事件 | 3 天 </br>5 天 </br>30 天 |

## Cron 表达式语法

 语法
 
  `cron(分钟 小时 月中的天 月 周中的天 年)`
 
 有关更多信息，请参阅 [基于 Cron 的计划](https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html?icmpid=docs_console_unmapped#cron-based)。


## 配置 Spark 作业参数

默认情况下，EMR 无服务器作业配置了[默认设置][jobs-spark]，适用于大多数情况，例如以小时为单位处理。

如果您的数据量非常庞大，例如总批次的行数超过 100,000,000，则默认设置可能不适用于此情况，这将导致 EMR 作业失败。您需要更改 EMR Spark 作业的配置。

您可以通过将文件 `s3://{PipelineS3Bucket}/{PipelineS3Prefix}{ProjectId}/config/spark-config.json` 添加到 S3 存储桶中来配置 EMR Spark 作业使用的资源。

请将 `{PipelineS3Bucket}`、`{PipelineS3Prefix}` 和 `{ProjectId}` 替换为您的数据管道的值。这些值可以在 `Clickstream-DataProcessing-<uuid>` 栈的 **参数** 中找到。

另外，您可以通过运行以下命令获取这些值：

```sh
stackNames=$(aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --no-paginate  | jq -r '.StackSummaries[].StackName' | grep  Clickstream-DataProcessing  | grep -v Nested)

echo -e "$stackNames" | while read stackName; do
    aws cloudformation describe-stacks --stack-name $stackName  | jq '.Stacks[].Parameters' | jq 'map(select(.ParameterKey == "PipelineS3Bucket" or .ParameterKey == "PipelineS3Prefix" or .ParameterKey == "ProjectId"))'
done
```

在解决方案基准测试中，数据处理作业花费约 15 分钟处理 100,000,000 行数据。

```json
{
   "sparkConfig": [
        "spark.emr-serverless.executor.disk=200g",
        "spark.executor.instances=16",
        "spark.dynamicAllocation.initialExecutors=48",
        "spark.executor.memory=100g",
        "spark.executor.cores=16"
    ],
    "inputRePartitions": 1000
}
```

有关更多配置，请参阅[Spark 作业属性][spark-defaults]和应用程序[工作节点设置][worker-configs]。

[jobs-spark]: https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/jobs-spark.html
[spark-defaults]: https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/jobs-spark.html#spark-defaults
[worker-configs]: https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/application-capacity.html#worker-configs
