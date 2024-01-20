# 获取报告
您可以使用用户获取报告深入了解新用户如何首次找到您的网站或应用。此报告还允许您查看详细的用户概要。

注意：本文描述了默认报告。您可以通过应用过滤器或比较，或通过在 QuickSight 中更改维度、指标或图表来自定义报告。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)

## 查看报告
1. 访问您应用程序的仪表板。请参阅 [访问仪表板](index.md/#view-dashboards)
2. 在仪表板中，单击名称为 **`Acquisition`** 的表。

## 数据来源
获取报告是基于 `User_Dim_View-<app>-<project>` 的 QuickSight 数据集创建的，该数据集连接到分析引擎（即 Redshift）中的 `clickstream_user_dim_view` 视图。以下是生成视图的 SQL 命令。
??? 示例 "SQL 命令"
    === "Redshift"
        ```sql title="clickstream-user-dim-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_user_dim_view_v1.sql:3"
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
|`first_visit_install_source`| 维度 | 用户首次打开应用时的安装来源。Web 为空  | 从分析引擎查询|
|`first_traffic_source_source`| 维度 | 用户首次访问应用或 Web 时的流量来源  | 从分析引擎查询|
|`first_traffic_source_medium`| 维度 | 用户首次访问应用或 Web 时的流量媒介  | 从分析引擎查询|
|`first_traffic_source_name`| 维度 | 用户首次访问应用或 Web 时的流量广告系列名称  | 从分析引擎查询|
|`first_visit_device_language`| 维度 | 用户首次打开应用或首次访问网站时所用设备的系统语言  | 从分析引擎查询|
|`first_platform`| 维度 | 用户首次访问您的网站或首次打开您的应用时的平台  | 从分析引擎查询|
|`first_referer`| 维度 | 用户首次访问您的网站时的引荐来源 | 从分析引擎查询|
|`first_visit_country`| 维度 | 用户首次访问您的网站或首次打开您的应用的国家  | 从分析引擎查询|
|`first_visit_city`| 维度 | 用户首次访问您的网站或首次打开您的应用的城市  | 从分析引擎查询|
|`custom_attr_key`| 维度 | 用户的自定义属性键的名称  | 从分析引擎查询|
|`custom_attr_value`| 维度 | 用户的自定义属性键的值  | 从分析引擎查询|
|`registration_status`| 维度 | 用户是否已注册  | 从分析引擎查询|
|`Logged-in Rate`| 指标 | 不同用户 ID 数除以不同用户伪 ID 数 | QuickSight 中的计算字段 |

## 示例仪表板
以下图片是一个示例仪表板供您参考。

![获取仪表板](../../images/analytics/dashboard/acquisition.png)
