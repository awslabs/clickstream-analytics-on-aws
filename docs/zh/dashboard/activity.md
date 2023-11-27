# 活动报表

您可以使用活动报表深入了解用户在使用您的网站和应用程序时执行的活动，此报表按用户触发的事件衡量用户活动，并让您查看事件的详细属性。

注意：本文介绍默认报表，您可以通过应用筛选器或比较，或者通过更改 QuickSight 中的维度、指标或图表来自定义报表，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)。

## 查看报表

1. 访问您的应用程序的仪表板。 参考[访问仪表板](index.md)。
2. 在仪表板中，单击名称为 **`Activity`**(活动) 的工作表。

## 数据从何而来

活动报表是基于以下 QuickSight 数据集创建的：

- 连接到分析引擎（即 Redshift 或 Athena）中的`clickstream_ods_event_rt__view`数据集`ods_events_view-<app id>-<project id>`
- 连接到分析引擎中的`clickstream_ods_events_parameter_rt_view`数据集`ods_events_parameter_view-<app id>-<project id>`

下面是生成相关视图的 SQL 命令。
??? example "SQL 命令"
    === "Redshift"
        ```sql title="clickstream-ods-events-rt-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/clickstream-ods-events-rt-view.sql:3"
        ```
    === "Athena"
        ```sql title="clickstream-ods-events-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-ods-events-query.sql"
        ```

## 维度和指标

该报表包含以下维度和指标，您可以通过在 QuickSight 数据集中创建“calculated field”（计算字段）来添加更多维度或指标，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

| 字段                                     | 类型  | 解释                                | 如何生成              |
| -------------------------------------- | --- | --------------------------------- | ----------------- |
| `event_id`                             | 维度  | SDK 为用户在使用您的网站和应用程序时触发的事件生成的唯一 ID | 来自分析引擎的查询         |
| `event_name`                           | 维度  | 事件名称                              | 来自分析引擎的查询         |
| `platform`                             | 维度  | 会话期间使用的平台用户                       | 来自分析引擎的查询         |
| `Event User Type`                      | 维度  | 执行事件的用户类型，即新用户或现有用户               | QuickSight 中的计算字段 |
| `event_date`                           | 指标  | 记录事件的日期（UTC 中的 YYYYMMDD 格式）       | 来自分析引擎的查询         |
| `event_timestamp`                      | 维度  | 在客户端记录事件的时间（以微秒为单位，UTC）           | 来自分析引擎的查询         |
| `app_info_version`                     | 维度  | 记录事件时应用程序或网站的版本                   | 来自分析引擎的查询         |
| `event_parameter_key`                  | 维度  | 事件参数的key                          | 来自分析引擎的查询         |
| `event_parameter_key`                  | 维度  | 事件参数的值                            | 来自分析引擎的查询         |
| `User activity number in last 7 days`  | 指标  | 最近 7 天记录的事件数                      | QuickSight 中的计算字段 |
| `User activity number in last 30 days` | 指标  | 最近 30 天记录的事件数                     | QuickSight 中的计算字段 |


## 示例仪表板
以下图片是一个示例仪表板供您参考。

![qs-activity](../images/analytics/dashboard/activity.png)