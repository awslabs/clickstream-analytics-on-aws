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

 ## 配置Spark作业参数

默认情况下，EMR Serverless作业配置为[默认设置][jobs-spark]，适用于大多数情况，例如按小时处理。

如果您的数据量巨大，例如单批次处理的数据行数超过1亿，则默认设置可能不适用于此情况，会导致EMR作业失败。您需要更改EMR Spark作业的配置。

您可以通过在S3存储桶中添加文件 `s3://{PipelineS3Bucket}/{PipelineS3Prefix}{ProjectId}/config/spark-config.json` 来配置EMR Spark作业使用的资源。

请使用数据流水线中的值替换 `{PipelineS3Bucket}`, `{PipelineS3Prefix}`, 和 `{ProjectId}` 。 这些值可以在`Clickstream-DataProcessing-<uuid>` 堆栈的 **参数**界面中找到。

此外，您可以通过运行以下命令获取这些值：

```sh
stackNames=$(aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --no-paginate  | jq -r '.StackSummaries[].StackName' | grep  Clickstream-DataProcessing  | grep -v Nested)

echo -e "$stackNames" | while read stackName; do
    aws cloudformation describe-stacks --stack-name $stackName  | jq '.Stacks[].Parameters' | jq 'map(select(.ParameterKey == "PipelineS3Bucket" or .ParameterKey == "PipelineS3Prefix" or .ParameterKey == "ProjectId"))'
done
```

使用下面配置，在解决方案的基准测试中，数据处理作业处理600,000,000行数据（200,000,000请求， 数据大小：170G gzip）大约花费了25分钟的时间。

```json
{
   "sparkConfig": [
        "spark.emr-serverless.executor.disk=200g",
        "spark.executor.instances=16",
        "spark.dynamicAllocation.initialExecutors=16",
        "spark.executor.memory=100g",
        "spark.executor.cores=16",
        "spark.network.timeout=10000000",
        "spark.executor.heartbeatInterval=10000000",
        "spark.shuffle.registration.timeout=120000",
        "spark.shuffle.registration.maxAttempts=5",
        "spark.shuffle.file.buffer=2m",
        "spark.shuffle.unsafe.file.output.buffer=1m"
    ],
    "inputRePartitions": 2000
}
```

请确保您有足够的 emr-serverless 配额，在 us-east-1 区域，您可以通过[emr-serverless-quotas][emr-serverless-quotas]查看配额。
更多信息请参阅 [Spark作业参数][spark-defaults]和应用[工作节点设置][worker-configs]。

[jobs-spark]: https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/jobs-spark.html
[spark-defaults]: https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/jobs-spark.html#spark-defaults
[worker-configs]: https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/application-capacity.html#worker-configs
[emr-serverless-quotas]: https://us-east-1.console.aws.amazon.com/servicequotas/home/services/emr-serverless/quotas/L-D05C8A75
