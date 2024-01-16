# 用户报告

您可以使用用户报告查询和查看个体用户的属性以及用户执行的事件。

注意：本文描述了默认报告。您可以通过应用过滤器或比较，或通过在 QuickSight 中更改维度、指标或图表来自定义报告。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)

## 查看报告
1. 访问您应用程序的仪表板。请参阅 [访问仪表板](index.md/#view-dashboards)。
2. 在仪表板中，单击名称为 **`User`** 的表。

## 数据来源
用户报告是基于以下 QuickSight 数据集创建的：

- `User_Dim_View-<app>-<project>`，该数据集连接到分析引擎（即 Redshift）中的 `clickstream_user_dim_view_v1` 视图。
- `User_Attr_View-<app>-<project>`，该数据集连接到 `clickstream_user_attr_view_v1`。以下是生成视图的 SQL 命令。
??? 示例 "SQL 命令"
    === "Redshift"
        ```sql title="clickstream_user_dim_view.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_user_dim_view_v1.sql:2"
        ```
    === "Athena"
        ```sql title="clickstream-user-dim-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-user-dim-query.sql"
        ```

## 维度和指标

报告包括以下维度和指标。您可以通过在 QuickSight 数据集中创建 `calculated field` 来添加更多维度或指标。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

|字段 | 类型| 是什么 | 如何填充|
|----------|---|---------|--------------------|
|`user_pseudo_id`| 维度 | 用户的 SDK 生成的唯一 ID | 从分析引擎查询|
|`user_id`| 维度 | 通过 SDK 中的 setUserId API 设置的用户 ID  | 从分析引擎查询|
|`device_id`| 维度 | 设备的唯一 ID，请参阅 [SDK 手册](../../sdk-manual/index.md) 了解设备 ID 的获取方式| 从分析引擎查询|
|`first_visit_date`| 维度 | 用户首次访问您的网站或首次打开应用的日期  | 从分析引擎查询|
|`first_visit_install_source`| 维度 | 用户首次打开您的应用时的安装来源。Web 为空  | 从分析引擎查询|
|`first_traffic_source_source`| 维度 | 用户首次访问应用或 Web 时的流量来源  | 从分析引擎查询|
|`first_traffic_source_medium`| 维度 | 用户首次访问应用或 Web 时的流量媒介  | 从分析引擎查询|
|`first_traffic_source_name`| 维度 | 用户首次访问应用或 Web 时的流量活动名称  | 从分析引擎查询|
|`first_visit_device_language`| 维度 | 用户首次打开您的应用或首次访问您的网站时所使用设备的系统语言  | 从分析引擎查询|
|`first_visit_device_language`| 维度 | 用户首次打开您的应用或首次访问您的网站时所使用设备的系统语言  | 从分析引擎查询|
|`first_platform`| 维度 | 用户首次访问您的网站或首次打开您的应用时的平台  | 从分析引擎查询|
|`first_referer`| 维度 | 用户首次访问您的网站时的引荐来源 | 从分析引擎查询|
|`first_visit_country`| 维度 | 用户首次访问您的网站或首次打开您的应用时所在的国家  | 从分析引擎查询|
|`first_visit_city`| 维度 | 用户首次访问您的网站或首次打开您的应用时所在的城市  | 从分析引擎查询|
|`custom_attr_key`| 维度 | 用户的自定义属性键的名称  | 从分析引擎查询|
|`custom_attr_value`| 维度 | 用户的自定义属性键的值  | 从分析引擎查询|
|`registration_status`| 维度 | 用户是否已注册  | 从分析引擎查询|
|`Event Time (HH:MM:SS)`| 维度 |事件在客户端记录的 MMDDYYYY HH:MM:SS 格式的时间  | QuickSight 中的计算字段|
|`event_id`| 维度 | 用户在使用您的网站和应用时触发的事件的 SDK 生成的唯一 ID  | 从分析引擎查询|
|`event_name`| 维度 | 事件的名称  | 从分析引擎查询|
|`platform`| 维度 | 用户在会话期间使用的平台  | 从分析引擎查询|
|`event_value_in_usd`| 指标 | 与事件相关的 USD 值  | 从分析引擎查询|
|`app_info_version`| 维度 | 与事件相关联的应用版本  | 从分析引擎查询|
|`geo_locale`| 维度 | 与事件相关的地理位置和语言环境信息  | 从分析引擎查询|
|`event_parameter_key`| 维度 | 事件参数的键  | 从分析引擎查询|
|`event_parameter_key`| 维度 | 事件参数的值  | 从分析引擎查询|
|`event_date`| 指标 | 记录事件的日期（UTC 中的 YYYYMMDD 格式）  | 从分析引擎查询|
|`event_timestamp`| 维度 | 事件在客户端记录时的时间（微秒，UTC）  | 从分析引擎查询|
|`app_info_version`| 维度 | 记录事件时的应用或网站版本  | 从分析引擎查询|

## 示例仪表板
以下图片是一个示例仪表板供您参考。

![用户仪表板](../../images/analytics/dashboard/user.png)
