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
        ```sql title="clickstream_event_view.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_event_view_v2.sql:2"
        ```
    === "Athena"
        ```sql title="clickstream-ods-events-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-event-query.sql"
        ```

## 维度和度量

报告包括以下维度和度量。您可以通过在QuickSight数据集中创建“计算字段”来添加更多维度或度量。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

|字段 | 类型| 是什么 | 如何填充|
|----------|---|---------|--------------------|
|`user_pseudo_id`| 维度 | 用户的SDK生成的唯一ID | 从分析引擎查询|
|`user_id`| 维度 | 通过SDK中的setUserId API设置的用户ID | 从分析引擎查询|
|`device_id`| 维度 | 设备的唯一ID，请参考[SDK手册](../../sdk-manual/user-identifier.md)了解如何获取设备ID | 从分析引擎查询|
|`Event Time (HH:MM:SS)`| 维度 | 事件在客户端记录时的MMDDYYYY HH:MM:SS格式的时间 | 在QuickSight中的计算字段|
|`event_id`| 维度 | 用户在使用您的网站和应用程序时触发的事件的SDK生成的唯一ID | 从分析引擎查询|
|`event_name`| 维度 | 事件的名称 | 从分析引擎查询|
|`platform`| 维度 | 用户在会话期间使用的平台 | 从分析引擎查询|
|`Crash Rate (by device)`| 度量 | 崩溃事件的设备百分比 | 在QuickSight中的计算字段|
|`app_info_version`| 维度 | 与事件关联的应用程序版本 | 从分析引擎查询|
|`geo_locale`| 维度 | 与事件关联的地理位置和区域信息 | 从分析引擎查询|
|`event_parameter_key`| 维度 | 事件参数的键 | 从分析引擎查询|
|`event_parameter_key`| 维度 | 事件参数的值 | 从分析引擎查询|
|`event_date`| 度量 | 记录事件的日期（UTC格式的YYYYMMDD） | 从分析引擎查询|
|`event_timestamp`| 维度 | 事件在客户端记录时的时间（微秒，UTC） | 从分析引擎查询|
|`app_info_version`| 维度 | 记录事件时应用程序或网站的版本 | 从分析引擎查询|
|`app_info_package_id`| 维度 | 记录事件时应用程序或网站的包ID | 从分析引擎查询|
|`app_info_sdk_name`| 维度 | 记录事件时的SDK名称 | 从分析引擎查询|
|`app_info_sdk_version`| 维度 | 记录事件时的SDK版本 | 从分析引擎查询|
|`app_info_package_id`| 维度 | 记录事件时应用程序或网站的包ID | 从分析引擎查询|
|`device_mobile_model_name`| 维度 | 设备的型号名称 | 从分析引擎查询|
|`device_network_type`| 维度 | 用户记录事件时的网络类型 | 从分析引擎查询|
|`device_operating_system`| 维度 | 设备的操作系统 | 从分析引擎查询|
|`device_operating_system_version`| 维度 | 设备的操作系统版本 | 从分析引擎查询|

  
## 示例仪表板

下面的图像是您参考的示例仪表板。

![崩溃仪表板](../../images/analytics/dashboard/crash.png)
  

