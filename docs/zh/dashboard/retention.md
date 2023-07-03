# 留存报表

您可以使用留存率报表深入了解用户在首次访问后与您的网站或移动应用程序互动的频率和时长，该报表可帮助您了解您的应用在吸引用户首次访问后回访方面的表现。

注意：本文介绍默认报表，您可以通过应用筛选器或比较，或者通过更改 QuickSight 中的维度、指标或图表来自定义报表，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)。

## 查看报表

1. 访问您的应用程序的仪表板。 参考[访问仪表板](index.md)。
2. 在仪表板中，单击名称为 **`Retention`**（留存） 的工作表。

## 数据从何而来

保留报表是基于以下 QuickSight 数据集创建的：

- `lifecycle_weekly_view-<app id>-<project id>`，它连接到分析引擎（即 Redshift 或 Athena）中的 `clickstream_lifecycle_weekly_view` 视图。
- `lifecycle_daily_view-<app id>-<project id>`，它连接到分析引擎（即 Redshift 或 Athena）中的 `clickstream_lifecycle_daily_view` 视图。
- 连接到分析引擎中的`clickstream_retention_view`视图的`retention_view-<app id>-<project id>`。

下面是生成视图的 SQL 命令。
??? example "SQL 命令"
    === "Redshift"
        ```sql title="clickstream-lifecycle-weekly-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/clickstream-lifecycle-weekly-view.sql:6"
        ```
        ```sql title="clickstream-lifecycle-dialy-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/clickstream-lifecycle-daily-view.sql:6"
        ```
    === "Athena"
        ```sql title="clickstream-lifecycle-weekly-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-lifecycle-weekly-query.sql"
        ```
        ```sql title="clickstream-lifecycle-daily-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-lifecycle-daily-query.sql"
        ```

## 维度和指标

该报表包含以下维度和指标，您可以通过在 QuickSight 数据集中创建“calculated field”（计算字段）来添加更多维度或指标，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

| 字段                            | 类型  | 解释                          | 如何生成      |
|-------------------------------|-----|-----------------------------|-----------|
|`Daily Active User (DAU)`| 指标 | 每个日期的活跃用户数 | QuickSight聚合|
|`Weekly Active User (WAU)`| 指标 | 最近 7 天的活跃用户数 | QuickSight 中的计算字段|
|`Monthly Active User (MAU)`| 指标 | 最近 30 天的活跃用户数 | QuickSight 中的计算字段|
|`user_pseudo_id`| 维度| SDK 为用户生成的唯一 ID | 来自分析引擎的查询|
|`user_id`| 维度| SDK中通过setUserId接口设置的用户ID | 来自分析引擎的查询|
|`DAU/WAU`| 指标 | 用户粘性的 DAU/WAU % | QuickSight 中的计算字段|
|`WAU/MAU`| 指标 | 用户粘性的 WAU/MAU % | QuickSight 中的计算字段|
|`DAU/MAU`| 指标 | 用户粘性的 DAU/MAU % | QuickSight 中的计算字段|
|`Event User Type`| 维度| 执行事件的用户类型，即新用户或现有用户 | QuickSight 中的计算字段|
|`User first touch date`| 指标 |用户首次使用您的网站或应用程序的日期 | QuickSight 中的计算字段|
|`Retention rate`| 指标 | 不同的活跃用户数/用户首次接触日期的不同活跃用户数 | QuickSight 中的计算字段|
|`time_period`| 维度| 用户生命周期的周或日 | 来自分析引擎的查询|
|`this_week_value`| 维度| 用户生命周期阶段，即新来、活跃、返回和流失 | 来自分析引擎的查询|
|`this_day_value`| 维度| 用户生命周期阶段，即新来、活跃、返回和流失 | 来自分析引擎的查询|


## 示例仪表盘
以下图片是一个示例仪表盘供您参考。

![qs-retention](../images/dashboard/retention.jpg)