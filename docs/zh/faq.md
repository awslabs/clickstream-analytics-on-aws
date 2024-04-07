# 常见问题

## 通用

### {{ solution_name }} 是什么？

{{ solution_name }}是一种 AWS 解决方案，使客户能够轻松地在 AWS 上构建点击流分析系统。 该解决方案使用可视化数据管道构建工具，根据客户的配置自动创建数据管道，并为 Web 和移动应用程序（包括 iOS、Android 和 Web JS）提供 SDK，以帮助客户收集客户端数据并将其摄取到数据管道中。数据摄取后，该解决方案允许客户进一步对事件数据富化和建模以供业务用户查询，并提供内置可视化看板（例如：用户获取、用户参与、留存）以帮助他们更快地产生洞察。

## 数据管道

### 何时使用 Redshift 无服务器用于数据建模？

如果数据流管道符合以下标准，则推荐使用无服务器 Redshift。

- 数据处理间隔等于或大于一小时。
- 报表查询和其他使用负载（例如 ETL），在最多几个小时内密集使用。
- 不使用 Redshift 进行流式摄取。
- 预估成本低于预置集群。

### 我已经在 Redshift 上启用了数据建模，那么为什么我在 Redshift 查询编辑器中看不到此解决方案创建的 schema 和表？

该解决方案在您的 Amazon Redshift 集群中创建一个单独的数据库和 schema，用于存储和处理点击流事件。 默认情况下，schema、表和视图仅由创建它们的用户拥有，并且对登录 Redshift [查询编辑器][redshift-query-editor]的其他用户不可见。

您可以使用超级用户或 Redshift `admin` 来查看它们。

- 对于预置集群，您可以使用配置数据管道时指定的管理员或数据库用户。
- 对于无服务器，schema 和表由解决方案管理的 IAM 角色创建； 该用户没有默认密码。 您可以[编辑无服务器命名空间的密钥][redshift-secrets-manager-integration]。

在查询编辑器中可查看 schema 和表后，您可以向[其他 Redshift 用户授予权限][redshift-grant]。

### 如何监控数据流管道的运行状况？

可以打开内置的 [可观测性仪表板][monitoring-dashboard] 来查看数据流管道的关键指标。

仪表板会显示数据流管道不同组件的指标，包括摄取、处理和建模。

- **Data Ingestion - Server**:
    - **Server Request Counts**: 指定时间段内摄取服务器接收的总请求数。您可以使用它来计算摄取服务器的每秒请求数 (RPS)。
    - **Server Response Time**: 指定时间段内摄取服务器的平均响应时间（秒）。
    - **Server(ECS) Tasks** 为摄取服务器运行的任务/实例数量。
- **Data Ingestion - Sink - Kinesis Data Stream** (启用 KDS 作为数据宿时可用):
    - **Kinesis Throttled and Failed Records**: 指定时间段内 KDS 的写入记录被限制或失败次数。值越低越好。
    - **Kinesis to S3 Lambda Error count**: 在将 KDS 记录下沉到 S3 时，指定时间段内的总错误数。值越低越好。
    - **Kinesis to S3 Lambda success rate (%)**: 将 KDS 记录下沉到 S3 的成功率百分比。值越高越好。
- **Data Processing** (启用数据处理时可用):
    - **Data Processing Job success rate (%)**: 指定时间段内数据处理作业成功率的百分比。值越高越好。
    - **Data Processing Row counts**: 图表包含四个指标： 
        - **source count**: 批处理数据处理中摄取服务器接收的原始请求数。
        - **flatted source count**: SDK 可能会在一个请求中批量发送多个点击流事件。它是将原始请求包含的数据展开后的总点击流事件数。
        - **sink count**: 在数据处理中成功进行转换和增强后的总有效点击流事件，然后再次下沉到 S3。
        - **corrupted count**: 数据处理批次中的总无效或无法处理的事件。如果此类事件占比较大，您可以检查配置为数据流管道的 S3 桶中路径为 `clickstream/<project id>/data/pipeline-temp/<project id>/job-data/etl_corrupted_json_data/jobName=<emr serverless run job id>/` 中损坏事件日志。
- **Data Modeling** (在 Redshift 上启用数据建模时可用):
    - **'Load data to Redshift tables' workflow**: 指定时间段内将处理完成的数据加载到 Redshift 流程的成功或失败执行数量。
    - **File max-age**: 数据处理下沉到 S3 后且未加载到 Redshift 的最长时间。方案有一个内置警报，当最长时间超过数据处理间隔时会触发。
    - **Redshift-Serverless ComputeCapacity** (使用 Redshift serverless 时可用) ：Redshift serverless 工作组的 RPU 使用量。如果使用的 RPU 计数总是达到 Redshift serverless 的最大 RPU 数量，则意味着 Redshift 中的工作负载没有足够的计算资源。


### 如何重新运行失败的数据处理作业？

偶尔，数据处理作业会失败。您可以重新运行失败的作业，以重新处理该时间段的数据。步骤如下：

1. 在 **EMR Studio** - **应用程序** - **Clickstream-<project id>** 中打开失败的作业。
2. 单击 **克隆** 操作。
3. 保持所有参数不变，然后单击 **提交作业运行** 按钮。

### 如何恢复失败的数据加载工作流？

此解决方案使用名为 `ClickstreamLoadDataWorkflow` 的工作流，由 Step Functions 编排，将处理后的数据加载到 Redshift。工作流使用 DynamoDB 表记录数据处理作业处理过的待加载的文件。任何故障都不会丢失还未加载到 Redshift 的数据。失败后再次执行工作流以恢复加载工作流可以保证数据完整的加载到 Redshift。

## 开发工具包

### 我可以使用其他SDK向该方案创建的管道发送数据吗？

可以。该方案支持用户使用第三方SDK向数据管道发送数据。需要注意的是，如果您想在使用第三方SDK发送数据时，在数据处理和数据建模模块，您需要提供一个转换插件来将第三方SDK的数据结构映射到解决方案数据结构。 详情请参考[自定义插件](./pipeline-mgmt/data-processing/configure-plugin.md)。

## 分析工作坊

### 为什么分析工作坊不可用?

出现此提示的原因有以下两种情况：

- 数据管道的版本不是v1.1或更高版本。您可以尝试升级数据管道，等待升级完成后再重试。
- 数据管道上未启用报告模块。

### 如何修改默认控制面板？

您无法直接修改默认仪表板，但是，您可以从默认仪表板创建新分析，然后根据复制的分析创建新仪表盘。以下是从默认仪表板创建分析的步骤：

1. 在分析工作室中，打开分析模块，然后单击 “控制面板”。
2. 打开名为 “Clickstream Dashboard-<app-id>-<project-id>” 的默认仪表板。
3. 单击 “共享” 图标，然后单击右上角的 “共享控制面板”。
4. 在新窗口中，在 “ClickStreamPublishUser” 的 “另存为分析” 列中启用允许 ”另存为“（如果看不到该列，请向右滚动窗口）。
5. 返回控制面板，刷新网页，你应该能够看到右上角的 “另存为” 按钮。
6. 单击 “另存为” 按钮，输入分析的名称，然后单击 “保存”，现在您应该可以在分析中看到新的分析，然后进行修改和发布为新的仪表板。

## 价格

### 使用此解决方案如何收费和计费？

该解决方案可免费使用，您需要承担运行该解决方案时使用的 AWS 服务的费用。
您只需为使用的内容付费，没有最低费用或设置费用。有关详细的成本估算，请参阅 [Cost](./plan-deployment/cost.md) 部分。

[monitoring-dashboard]: ./pipeline-mgmt/pipe-mgmt.md#_2
[redshift-query-editor]: https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html
[redshift-secrets-manager-integration]: https://docs.aws.amazon.com/redshift/latest/mgmt/redshift-secrets-manager-integration.html
[redshift-grant]: https://docs.aws.amazon.com/redshift/latest/dg/r_GRANT.html