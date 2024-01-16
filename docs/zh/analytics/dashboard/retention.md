# 留存报告
您可以使用留存报告来深入了解用户在首次访问您的网站或移动应用程序后与您的网站或移动应用程序互动的频率和时长。 该报告可帮助您了解您的应用在吸引用户首次访问后再次访问方面的表现如何。

注意：本文介绍默认报告。 您可以通过应用筛选器或比较或更改 QuickSight 中的维度、指标或图表来自定义报告。 [了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## 查看报告
1. 访问您的应用程序的仪表板。 参考【访问仪表板】(index.md)
2. 在仪表板中，单击名称为 **`Retention`** 的工作表。

## 数据从哪里来
留存报告是基于以下 QuickSight 数据集创建的：

- `lifecycle_weekly_view-<app id>-<project id>`，连接到分析引擎（即 Redshift 或 Athena）中的 `clickstream_lifecycle_weekly_view_v1` 视图。
- `lifecycle_daily_view-<app id>-<project id>`，连接到分析引擎（即 Redshift 或 Athena）中的 `clickstream_lifecycle_daily_view_v1` 视图。
- 连接到分析引擎中的 `clickstream_retention_view_v1` 视图。

下面是生成视图的 SQL 命令。
??? 示例 "SQL 命令"
    === "Redshift"
        ```sql title="clickstream_lifecycle_weekly_view_v1.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_lifecycle_weekly_view_v1.sql:2"
        ```
        ```sql title="clickstream_lifecycle_daily_view_v1.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_lifecycle_daily_view_v1.sql:2"
        ```
        ```sql title="clickstream_retention_view_v1.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_retention_view_v1.sql:6"
        ```
    === "Athena"
        ```sql title="clickstream-lifecycle-weekly-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-lifecycle-weekly-query.sql"
        ```
        ```sql title="clickstream-lifecycle-daily-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-lifecycle-daily-query.sql"
        ```
        ```sql title="clickstream-lifecycle-daily-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-retention-query.sql"
        ```

## 维度和指标
该报告包括以下维度和指标。 您可以通过在 QuickSight 数据集中创建“计算字段”来添加更多维度或指标。 [了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

|字段| 类型| 这是什么 | 如何填充|
|----------|---|---------|--------------------|
|`每日活跃用户 (DAU)`| 指标| 每个日期的活跃用户数 | QuickSight聚合|
|`每周活跃用户 (WAU)`| 指标| 近7天活跃用户数 | QuickSight 中的计算字段|
|`每月活跃用户 (MAU)`| 指标| 过去 30 天内的活跃用户数 | QuickSight 中的计算字段|
|`user_pseudo_id`| 维度| SDK 为用户生成的唯一 ID | 来自分析引擎的查询|
|`用户id`| 维度| 通过SDK中的setUserId API设置的用户ID | 来自分析引擎的查询|
|`日活跃用户/月活跃用户`| 指标| 用户粘性的 DAU/WAU % | QuickSight 中的计算字段|
|`月活跃用户/月活跃用户`| 指标| 用户粘性的 WAU/MAU % | QuickSight 中的计算字段|
|`日活跃用户/月活跃用户`| 指标| 用户粘性的 DAU/MAU % | QuickSight 中的计算字段|
|`事件用户类型`| 维度| 执行事件的用户类型，即新用户或现有用户 | QuickSight 中的计算字段|
|`用户首次触摸日期`| 指标|用户首次使用您的网站或应用程序的日期| QuickSight 中的计算字段|
|`留存率`| 指标| 不同的活跃用户数量 / 按用户首次接触日期划分的不同的活跃用户数量 | QuickSight 中的计算字段|
|`时间周期`| 维度| 用户生命周期的周或天 | 来自分析引擎的查询|
|`本周值`| 维度| 用户生命周期阶段，即新用户、活跃用户、返回用户和流失用户 来自分析引擎的查询|
|`this_day_value`| 维度| 用户生命周期阶段，即新用户、活跃用户、返回用户和流失用户 来自分析引擎的查询|

## 示例仪表板
下图是一个示例仪表板供您参考。

![仪表板留存](../../images/analytics/dashboard/retention.png)
