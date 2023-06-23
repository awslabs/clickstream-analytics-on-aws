# 数据建模设置

数据管道处理完事件数据后，您可以将数据加载到分析引擎进行数据建模，比如Redshift或Athena，其中数据将被汇总并组织成不同的视图（如事件、设备、会话），以及常用的计算指标。以下是如果你选择启用数据建模模块，此解决方案提供的预设数据视图。

## 预设数据视图

| 数据模型名称                 | Redshift | Athena | 描述                                                                  |
|-----------------------------|-----------|--------|----------------------------------------------------------------------|
| clickstream_ods_event_rt_view    | 物化视图    | 视图 | 包含所有事件维度的视图。      |
| clickstream_ods_event_parameter_rt_view    | 物化视图    | 视图 | 包含所有事件参数的视图。        |
| clickstream_user_dim_view    | 物化视图    | 视图 | 包含所有用户维度的视图。                     |
| clickstream_user_attr_view    | 物化视图    | 视图 | 包含所有用户自定义属性的视图。        |
| clickstream_session_view    | 物化视图    | 视图 | 包含所有会话维度和相关度量，例如，会话持续时间，会话视图。        |
| clickstream_retention_view    | 物化视图    | 视图 | 包含按日期和返回日度量的保留指标的视图。        |
| clickstream_lifecycle_daily_view    | 物化视图    | 视图 | 包含按生命周期阶段划分的用户数量的度量指标的日视图，即，新用户，活跃用户，返回用户，流失用户。        |
| clickstream_lifecycle_weekly_view    | 物化视图    | 视图 | 包含按生命周期阶段划分的用户数量的度量指标的周视图，即，新用户，活跃用户，返回用户，流失用户。        |
| clickstream_path_view    | 物化视图    | 视图 | 包含关于每个会话中用户旅程的信息的视图。        |

您可以选择使用Redshift或Athena，或两者都用。

!!! note "注意"

    我们建议你选择两者都用，也就是说，使用Redshift进行热数据建模，并使用Athena进行全时间数据分析。

您可以为 Redshift 设置以下配置。

  * **Redshift 模式**：选择 Redshift 无服务器或预设模式。

    * **无服务器模式**

        * **基础 RPU**：RPU 代表 Redshift 处理单元。Amazon Redshift Serverless 以 RPU 计算数据仓库容量，这些是处理工作负载所使用的资源。基础容量指定 Amazon Redshift 用于服务查询的基础数据仓库容量，并以 RPU 表示。提高基础容量可以改善查询性能，尤其是对于消耗大量资源的数据处理工作。

        * **VPC**：基于 Amazon VPC 服务的虚拟私有云（VPC）是您在 AWS 云中的私有、逻辑隔离的网络。

            > **注意**：如部署在逻辑隔离的网络中，VPC 必须为 S3，Logs，Dynamodb，STS，States, Redshift 以及 Redshift-data 服务拥有 VPC 终端。

        * **安全组**：此 VPC 安全组定义了可以在 VPC 中使用的哪些子网和 IP 范围可访问 Redshift 服务端点。

        * **子网**：选择至少三个现有的 VPC 子网。

            > **注意**：我们建议出于最佳安全实践使用私有子网进行部署。

    * **预设模式**

    * **数据范围**：考虑到让 Redshift 保存所有数据的成本效益问题，我们建议 Redshift 仅保存热数据，而所有数据都存储在 S3 中。需要定期在 Redshift 中删除过期数据。

* **附加设置**

    * **用户表插入更新频率**：由于所有版本的用户属性都保存在 Redshift 中。我们在 DWD 层创建了一个用户范围的自定义维度表 `dim_users`，以便 BI 仪表板可以报告最新的用户属性。工作流按计划运行以插入更新（更新和插入）用户。

* **Athena**：选择 Athena 使用在 Glue 数据目录中创建的表查询 S3 上的所有数据。
