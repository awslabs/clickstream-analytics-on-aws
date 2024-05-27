# 常见问题

## 通用

### {{ solution_name }} 是什么？

{{ solution_name }}是一种 AWS 解决方案，使客户能够轻松地在 AWS 上构建点击流分析系统。 该解决方案使用可视化数据管道构建工具，根据客户的配置自动创建数据管道，并为 Web 和移动应用程序（包括 iOS、Android 和 Web JS）提供 SDK，以帮助客户收集客户端数据并将其摄取到数据管道中。数据摄取后，该解决方案允许客户进一步对事件数据富化和建模以供业务用户查询，并提供内置可视化看板（例如：用户获取、用户参与、留存）以帮助他们更快地产生洞察。

## 价格

### 使用此解决方案如何收费和计费？

该解决方案可免费使用，您需要承担运行该解决方案时使用的 AWS 服务的费用。
您只需为使用的内容付费，没有最低费用或设置费用。有关详细的成本估算，请参阅 [Cost](./plan-deployment/cost.md) 部分。

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

### 如何重新计算开箱即用仪表板的历史事件?

预设的仪表板中的指标是每天计算一次的。如果在历史数据发生更改的情况下需要重新计算指标，您可以手动重新安排工作流来重新计算指标。按照以下步骤操作：

1. 在 AWS 控制台中打开数据管道所在区域的 Step Functions 服务。
1. 找到名为 **RefreshMaterializedViewsWorkflowRefreshMVStateMachine** 的状态机。如果您在同一区域有多个项目,请检查状态机的标签，以确保它属于您要重新计算指标的项目。
1. 使用以下`JSON输入`启动新执行。您需要将 `refreshStartTime` 和 `refreshEndTime` 值更改为您要重新计算的数据范围的日期范围。
```json
{
"refreshEndTime": 1715406892000,
"refreshStartTime": 1711929600000
}
```

## 分析工作坊

### 为什么分析工作坊不可用?

出现此提示的原因有以下两种情况：

- 数据管道的版本不是v1.1或更高版本。您可以尝试升级数据管道，等待升级完成后再重试。
- 数据管道上未启用报告模块。

### 如何修改默认仪表板？

您无法直接修改默认仪表板，但是，您可以从默认仪表板创建新分析，然后根据复制的分析创建新仪表盘。以下是从默认仪表板创建分析的步骤：

1. 在分析工作室中，打开分析模块，然后单击 “控制面板”。
2. 打开名为 “Clickstream Dashboard-<app-id>-<project-id>” 的默认仪表板。
3. 单击 “共享” 图标，然后单击右上角的 “共享控制面板”。
4. 在新窗口中，在 “ClickStreamPublishUser” 的 “另存为分析” 列中启用允许 ”另存为“（如果看不到该列，请向右滚动窗口）。
5. 返回控制面板，刷新网页，你应该能够看到右上角的 “另存为” 按钮。
6. 单击 “另存为” 按钮，输入分析的名称，然后单击 “保存”，现在您应该可以在分析中看到新的分析，然后进行修改和发布为新的仪表板。

### 如何加快默认仪表板的加载速度?

您可以通过将 QuickSight 数据集转换为 SPICE 模式来加快报表加载。以下是操作步骤:

1. 通过 QuickSight 控制台购买 SPICE 容量。所需容量取决于您的数据量，建议启用自动购买选项。
2. 打开解决方案控制台，选择目标项目，单击管道详细信息页面上的管道**活跃**状态，然后打开 **Reporting** 堆栈详情链接，进入 CloudFormation 控制台中。
3. 单击**更新**按钮，选择**使用现有模板**选项。
4. 找到 **Enable QuickSight SPICE Import Mode** 参数，将其值更改为 **yes**。保持其他参数不变。
5. 单击下一步完成堆栈更新。更新完成后，您可以开始使用它。

!!! info "重要"

    1. 启用 SPICE 将根据使用的空间量产生费用。定价详情可在 QuickSight 定价页面上找到。如果频繁查看仪表板，启用 SPICE 可减少对 Redshift 数据库的访问负载，但可能会增加数据延迟。
    2. 默认情况下，该解决方案使用增量更新方法在 SPICE 中刷新数据。刷新过程计划在您的仪表板时区每天上午 6 点进行。您可以在 QuickSight 中手动调整更新时间表。
   
### 如何为 Analytics Studio 实现专用 Redshift？

Redshift 支持[跨集群共享数据][redshift-share-data]，这样您就可以使用专用的 Redshift 集群为 Analytics Studio 提供更好的查询性能和成本优化。

在实现 Amazon Redshift 数据共享之前，请注意以下几点：

- 您可以在同集群类型之间共享数据，也可以在预置的集群和无服务器集群之间共享数据。
- 只有 **RA3** 类型的预置集群和 **Redshift 无服务器集群**支持数据共享。

以 Redshift 无服务器集群作为数据共享的示例，请按照以下操作步骤执行:

1. [创建 Redshift 无服务器集群][serverless-console-workflows]作为数据消费者。
2. 在生产者 Redshift 数据库(Clickstream 解决方案中配置的项目数据库)中运行 SQL 创建数据共享并授予消费者权限：
    ```sql
    -- 创建 Data sharing

    CREATE DATASHARE <data share name> SET PUBLICACCESSIBLE FALSE;
    ALTER DATASHARE <data share name> ADD SCHEMA <schema>;
    ALTER DATASHARE <data share name> ADD ALL TABLES IN SCHEMA <schema>;

    -- 将 Data sharing 授权给消费者 Redshift

    GRANT USAGE ON DATASHARE <data share name> TO NAMESPACE '<consumer namespace id>';
    ```
    将 `<data share name>` 替换为共享名称，将 `<schema>` 替换为您要共享的schema，将 `<consumer namespace id>` 替换为消费者 Redshift 无服务器命名空间 ID。
3. 在消费者 Redshift 数据库中运行 SQL:
    ```sql
    -- 创建 database 

    CREATE DATABASE <new database name> WITH PERMISSIONS FROM DATASHARE <data share name> OF NAMESPACE '<source namespace id>';
   
    -- 创建 bi 用户
    CREATE USER bi_user PASSWORD '<strong password>';
    GRANT USAGE ON DATABASE "<new database name>" TO bi_user;
    GRANT USAGE ON SCHEMA "<new database name>"."<schema>" TO bi_user;
    GRANT SELECT ON ALL TABLES IN SCHEMA "<new database name>"."<schema>" TO bi_user;

    -- 给Data api role赋予权限
    CREATE USER "IAMR:<data api role name>" PASSWORD DISABLE;
    GRANT USAGE ON DATABASE "<new database name>" TO "IAMR:<data api role name>";
    GRANT USAGE ON SCHEMA "<new database name>"."<schema>" TO "IAMR:<data api role name>";
    GRANT SELECT ON ALL TABLES IN SCHEMA "<new database name>"."<schema>" TO "IAMR:<data api role name>";

    -- 测试 bi_user 权限 (可选)
    SET SESSION AUTHORIZATION bi_user;
    SELECT CURRENT_USER;
    SELECT * FROM "<new database name>"."<schema>"."event_v2" limit 1;
    ```
    将 `<new database name>` 替换为消费者 Redshift 中的数据库名称(可以与原始数据库名称不同)，将 `<source namespace id>` 替换为生产者 Redshift 无服务器命名空间 ID，将`<data api role name>`替换为Data Api Role的名称，这个值可以从Reporting堆栈的输出**RedshiftDataApiRoleArn**获得。
4. 在 Secrets Manager 中为 BI 用户创建一个新的机密，将值指定为纯文本，如下所示：
   ```json
   {"username":"bi_user","password":"<strong password>"}
   ```
   **密钥名称**应该类似于：`/clickstream/reporting/user/bi_user`。
5. 转到AWS控制台中的Cloudformation，更新报告堆栈以使用消费者Redshift：
    - **Redshift Endpoint Url** (必需)：消费者 Redshift 访问端点
    - **Redshift Default database name** (必需)： `dev`
    - **Redshift Database Name** (必需)：`<new database name>`
    - **Parameter Key Name** (必需)：`<密钥名称>`
    - 逗号分隔的安全组 ID (可选)： 用于访问 Redshift 的 VPC 连接的安全组
    - 逗号分隔的子网 ID (可选)：消费者 Redshift 的子网 ID

## 开发工具包

### 我可以使用其他SDK向该方案创建的管道发送数据吗？

可以。该方案支持用户使用第三方SDK向数据管道发送数据。需要注意的是，如果您想在使用第三方SDK发送数据时，在数据处理和数据建模模块，您需要提供一个转换插件来将第三方SDK的数据结构映射到解决方案数据结构。 详情请参考[自定义插件](./pipeline-mgmt/data-processing/configure-plugin.md)。

[monitoring-dashboard]: ./pipeline-mgmt/pipe-mgmt.md#_2
[redshift-query-editor]: https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html
[redshift-secrets-manager-integration]: https://docs.aws.amazon.com/redshift/latest/mgmt/redshift-secrets-manager-integration.html
[redshift-grant]: https://docs.aws.amazon.com/redshift/latest/dg/r_GRANT.html
[serverless-console-workflows]: https://docs.aws.amazon.com/redshift/latest/mgmt/serverless-console-workflows.html
[redshift-share-data]: https://docs.aws.amazon.com/redshift/latest/dg/datashare-overview.html
