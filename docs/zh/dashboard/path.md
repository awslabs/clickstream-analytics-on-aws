# 路径探索报表

您可以使用路径探索报表深入了解用户使用您的应用程序或网站时的用户旅程，它可以帮助您了解事件的顺序以及应用程序中的屏幕或页面转换。

注意：本文介绍默认报表，您可以通过应用筛选器或比较，或者通过更改 QuickSight 中的维度、指标或图表来自定义报表，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)。

## 查看报表

1. 访问您的应用程序的仪表板。 参考[访问仪表板](index.md)。
2. 在仪表板中，单击名称为 **`Path explorer`**（路径探索）的工作表。

## 数据从何而来
设备报表是基于以下 QuickSight 数据集创建的：

- `path_view-<app id>-<project id>`，它连接到分析引擎（即 Redshift 或 Athena）中的 `clickstream_path_view` 视图。

下面是生成视图的 SQL 命令。
??? example "SQL 命令"
    === "Redshift"
        ```sql title="clickstream-path-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/clickstream-path-view.sql:6"
        ```
    === "Athena"
        ```sql title="clickstream-path-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-path-query.sql"
        ```

## 维度和指标

该报表包含以下维度和指标，您可以通过在 QuickSight 数据集中创建“calculated field”（计算字段）来添加更多维度或指标，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

| 字段                            | 类型  | 解释                                | 如何生成      |
|-------------------------------|-----|-----------------------------------|-----------|
|`event_id`| 维度| 事件的唯一 ID                          |来自分析引擎的查询|
|`user_pseudo_id`| 维度| SDK 为用户生成的唯一 ID                   | 来自分析引擎的查询|
|`event_date`| 维度| 记录设备信息时的事件数据                      | 来自分析引擎的查询|
|`event_timestamp`| 维度| 事件发生时的时间戳                         | 来自分析引擎的查询|
|`platform`| 维度| 记录事件时使用的平台用户                      | 来自分析引擎的查询|
|`session_id`| 维度| SDK 为使用您的网站和应用程序时触发的会话用户生成的唯一 ID  | 来自分析引擎的查询|
|`current_screen`| 维度| 屏幕用户在事件中打开，对于那些没有查看屏幕或网页的事件为“null” | 来自分析引擎的查询|
|`event_rank`| 维度| 会话中事件的顺序                          | 来自分析引擎的查询|
|`previous_event`| 维度| 上一个事件的事件名称                        | 来自分析引擎的查询|
|`next_event`| 维度| 下一个事件的事件名称                        | 来自分析引擎的查询|
|`previous_screen`| 维度| 上一画面的画面名称                         | 来自分析引擎的查询|
|`next_screen`| 维度| 下一个屏幕的屏幕名称                        | 来自分析引擎的查询|


## 示例仪表盘
以下图片是一个示例仪表盘供您参考。

![qs-path](../images/dashboard/path.png)