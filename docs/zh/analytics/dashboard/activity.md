# 活动报告
您可以使用活动报告来深入了解用户在使用您的网站和应用程序时执行的活动。 此报告通过用户触发的事件来衡量用户活动，并让您查看事件的详细属性。

注意：本文介绍默认报告。 您可以通过应用筛选器或比较或更改 QuickSight 中的维度、指标或图表来自定义报告。 [了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## 查看报告
1. 访问您的应用程序的仪表板。 参考【访问仪表板】(index.md)
2. 在仪表板中，单击名称为 **`Activity`** 的工作表。

## 数据从哪里来
活动报告是基于以下 QuickSight 数据集创建的：

- `Events_View-<app id>-<project id>` 连接到分析引擎（即 Redshift）中的 `clickstream_event_view_v1` 视图
- `Events_Parameter_View-<app id>-<project id>` 连接到分析引擎中的 `clickstream_events_parameter_view_v1` 视图

下面是生成相关视图的 SQL 命令。

??? 示例 "SQL 命令"
    === "Redshift"
        ```sql title="clickstream_event_view_v1.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_event_view_v1.sql:6"
        ```
    === "Athena"
        ```sql title="clickstream-ods-events-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-event-query.sql"
        ```

## 维度和指标
该报告包括以下维度和指标。 您可以通过在 QuickSight 数据集中创建“计算字段”来添加更多维度或指标。 [了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

|字段| 类型| 这是什么 | 如何填充|
|----------|---|---------|--------------------|
|`event_id`| 维度| SDK 为用户在使用您的网站和应用程序时触发的事件生成唯一 ID | 来自分析引擎的查询|
|`事件名称`| 维度|事件名称| 来自分析引擎的查询|
|`平台`| 维度| 会话期间用户使用的平台 | 来自分析引擎的查询|
|`事件用户类型`| 维度| 执行事件的用户类型，即新用户或现有用户 | QuickSight 中的计算字段|
|`事件日期`| 指标| 记录事件的日期（UTC 格式的 YYYYMMDD）。 | 来自分析引擎的查询|
|`事件时间戳`| 维度| 客户端记录事件的时间（以微秒为单位，UTC）。 | 来自分析引擎的查询|
|`app_info_version`| 维度| 记录事件时应用程序或网站的版本 | 来自分析引擎的查询|
|`event_parameter_key`| 维度| 事件参数key | 来自分析引擎的查询|
|`event_parameter_key`| 维度| 事件参数的值| 来自分析引擎的查询|
|`最近7天的用户活跃数`| 指标| 过去 7 天记录的事件数 | QuickSight 中的计算字段|
|`最近30天内的用户活动数`| 指标| 过去 30 天记录的事件数 | QuickSight 中的计算字段|
|`视图`| 指标| `_screen_view` 或 `_page_view` 事件的数量 | QuickSight 中的计算字段|
|`屏幕时间`| 指标| 屏幕或网页上的参与时间（以分钟为单位）| QuickSight 中的计算字段|


## 示例仪表板
下图是一个示例仪表板供您参考。

![仪表板活动](../../images/analytics/dashboard/activity.png)