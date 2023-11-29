# 崩溃报告

崩溃报告提供有关应用程序中崩溃事件的度量和信息。

**注意：** 本文描述默认报告。您可以通过在QuickSight中应用过滤器或比较，或更改维度、度量或图表来自定义报告。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)

## 查看报告

1. 访问应用程序的仪表板。请参阅[访问仪表板](index.md/#view-dashboards)。
2. 在仪表板中，单击名称为**`Crash`**的工作表。

## 数据来源

崩溃报告是基于以下QuickSight数据集创建的：

- `clickstream_user_dim_view_v1` - 连接到分析引擎中的`clickstream_event_view_v1`视图（例如，Redshift）。
- `Events_Parameter_View-<app id>-<project id>` - 连接到分析引擎中的`clickstream_events_parameter_view_v1`视图。

??? example "SQL Commands"
    === "Redshift"
        ```sql title="clickstream_event_view_v1.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_event_view_v1.sql:3"
        ```
    === "Athena"
        ```sql title="clickstream-ods-events-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-event-query.sql"
        ```


  
## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-crash](../../images/analytics/dashboard/crash.png)
