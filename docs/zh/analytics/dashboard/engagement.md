# 参与度报告
您可以使用参与度报告深入了解用户在使用您的网站和应用时的参与度水平。该报告通过用户触发的会话以及用户访问的网页和应用屏幕来衡量用户参与度。

注意：本文描述了默认报告。您可以通过应用过滤器或比较，或通过在 QuickSight 中更改维度、指标或图表来自定义报告。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)

## 查看报告
1. 访问您应用程序的仪表板。请参阅 [访问仪表板](index.md)。
2. 在仪表板中，单击名称为 `Engagement` 的表。

## 数据来源
参与度报告是基于 `Session_View-<app id>-<project id>` 的 QuickSight 数据集创建的，该数据集连接到分析引擎（即 Redshift 或 Athena）中的 `clickstream_session_view_v1` 视图。以下是生成视图的 SQL 命令。
??? 示例 "SQL 命令"
    === "Redshift"
        ```sql title="clickstream-session-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_session_view_v1.sql:7"
        ```
    === "Athena"
        ```sql title="clickstream-session-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-session-query.sql"
        ```

## 维度和指标
报告包括以下维度和指标。您可以通过在 QuickSight 数据集中创建 `calculated field` 来添加更多维度或指标。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

|字段 | 类型| 是什么 | 如何填充|
|----------|---|---------|--------------------|
|`session_id`| 维度 | 用户在使用您的网站和应用时触发的会话的 SDK 生成的唯一 ID | 从分析引擎查询|
|`user_pseudo_id`| 维度 | 用户的 SDK 生成的唯一 ID  | 从分析引擎查询|
|`platform`| 维度 | 用户在会话期间使用的平台  | 从分析引擎查询|
|`session_duration`| 维度 | 会话的持续时间（毫秒）  | 从分析引擎查询|
|`session_views`| 指标 | 会话内的屏幕视图或页面视图数量  | 从分析引擎查询|
|`engaged_session`| 维度 | 会话是否参与。</br>`参与的会话定义为会话持续时间超过 10 秒或有两个或两个以上的屏幕视图页面视图` | 从分析引擎查询|
|`session_start_timestamp`| 维度 | 会话的开始时间戳  | 从分析引擎查询|
|`session_engagement_time`| 维度 | 会话的总参与时间（毫秒）  | 从分析引擎查询|
|`entry_view`| 维度 | 用户在会话中查看的第一个屏幕或页面的屏幕名称或页面标题  | 从分析引擎查询|
|`exit_view`| 维度 | 用户在会话中查看的最后一个屏幕或页面的屏幕名称或页面标题  | 从分析引擎查询|
|`Average engaged session per user`| 指标 | 所选时间段内每个用户的平均会话数  | QuickSight 中的计算字段|
|`Average engagement time per session`| 指标 | 每个会话的平均参与时间（毫秒）  | QuickSight 中的计算字段|
|`Average engagement time per user`| 指标 | 每个用户的平均参与时间（毫秒）  | QuickSight 中的计算字段|
|`Average screen view per user`| 指标 | 每个用户的平均屏幕视图数  | QuickSight 中的计算字段|

## 示例仪表板
以下图片是一个示例仪表板供您参考。

![参与度仪表板](../../images/analytics/dashboard/engagement.png)
