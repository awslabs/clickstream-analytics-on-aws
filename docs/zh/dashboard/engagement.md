# 参与度报表

您可以使用参与度报表深入了解用户在使用您的网站和应用程序时的参与度，该报表通过用户触发的会话以及用户访问的网页和应用程序屏幕来衡量用户参与度。

注意：本文介绍默认报表，您可以通过应用筛选器或比较，或者通过更改 QuickSight 中的维度、指标或图表来自定义报表，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)。


## 查看报表
1. 访问您的应用程序的仪表板。参考[访问仪表板](index.md)。
2. 在仪表板中，单击名称为`Engagement（参与度）`的工作表。

## 数据从何而来

参与报表是基于`session_view-<app id>-<project id>`的 QuickSight 数据集创建的，它连接到分析引擎（即 Redshift 或 Athena）中的 `clickstream_session_view` 视图，下面是生成视图的 SQL 命令。

??? example "SQL 命令"
    === "Redshift"
        ```sql title="clickstream-session-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/clickstream-session-view.sql:7"
        ```
    === "Athena"
        ```sql title="clickstream-session-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-session-query.sql"
        ```

## 维度和指标
该报表包含以下维度和指标，您可以通过在 QuickSight 数据集中创建“calculated field”（计算字段）来添加更多维度或指标，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

| 字段                            | 类型  | 解释                            | 如何生成      |
|-------------------------------|-----|-------------------------------|-----------|
|`session_id`| 维度  | SDK 为使用您的网站和应用程序时触发的会话用户生成的唯一 ID | 来自分析引擎的查询|
|`user_pseudo_id`| 维度  | SDK 为用户生成的唯一 ID | 来自分析引擎的查询|
|`platform`| 维度  | 会话期间使用的平台用户 | 来自分析引擎的查询|
|`session_duration`| 维度  | 会话的长度（以毫秒为单位）| 来自分析引擎的查询|
|`session_views`| 指标  | 会话中的屏幕视图或页面视图数 | 来自分析引擎的查询|
|`engaged_session`| 维度  | 会话是否参与 </br>`参与会话定义为会话持续超过 10 秒或有两次或更多屏幕浏览页面浏览量` | 来自分析引擎的查询|
|`session_start_timestamp`| 维度  | 会话的开始时间 | 来自分析引擎的查询|
|`session_engagement_time`| 维度  | 会话的总参与时间（以毫秒为单位）| 来自分析引擎的查询|
|`entry_view`| 维度  | 用户在会话中查看的第一个屏幕或页面的屏幕名称或页面标题 | 来自分析引擎的查询|
|`exit_view`| 维度  | 用户在会话中查看的最后一个屏幕或页面的屏幕名称或页面标题 | 来自分析引擎的查询|
|`Average engaged session per user`| 指标  | 所选时间段内每个用户的平均会话数 | QuickSight 中的计算字段|
|`Average engagement time per session`| 指标  | 所选时间段内每个会话的平均参与时间 | QuickSight 中的计算字段|
|`Average engagement time per user`| 指标  | 所选时间段内每个用户的平均参与时间 | QuickSight 中的计算字段|
|`Average screen view per user`| 指标  | 所选时间段内每个用户的平均屏幕浏览量 | QuickSight 中的计算字段|
