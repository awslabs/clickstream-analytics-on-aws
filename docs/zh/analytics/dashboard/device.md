# 设备报告

您可以使用设备报告深入了解用户在使用您的应用或网站时所使用的设备。该报告为您的用户档案提供了更多信息。

注意：本文描述了默认报告。您可以通过应用过滤器或比较，或通过在 QuickSight 中更改维度、指标或图表来自定义报告。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)

## 查看报告

1. 访问您应用程序的仪表板。请参阅 [访问仪表板](index.md)。
2. 在仪表板中，单击名称为 **`Device`** 的表。

## 数据来源

设备报告是基于以下 QuickSight 数据集创建的：

- `Device_View-<app id>-<project id>`，该数据集连接到分析引擎（即 Redshift 或 Athena）中的 `clickstream_device_view_v1` 视图。

以下是生成视图的 SQL 命令。
??? 示例 "SQL 命令"
    === "Redshift"
        ```sql title="clickstream_device_view_v1.sql"
        --8<-- "src/analytics/private/sqls/redshift/dashboard/clickstream_device_view_v1.sql:6"
        ```
    === "Athena"
        ```sql title="clickstream-device-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-device-query.sql"
        ```

## 维度和指标

报告包括以下维度和指标。您可以通过在 QuickSight 数据集中创建 `calculated field` 来添加更多维度或指标。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

|字段 | 类型| 是什么 | 如何填充|
|----------|---|---------|--------------------|
|`device_id`| 维度 | 设备的唯一 ID，请参阅 [SDK 手册](../../sdk-manual/index.md) 了解设备 ID 的获取方式| 从分析引擎查询|
|`user_pseudo_id`| 维度 | 用户的 SDK 生成的唯一 ID | 从分析引擎查询|
|`user_id`| 维度 | 通过 SDK 中的 setUserId API 设置的用户 ID  | 从分析引擎查询|
|`event_date`| 维度 | 记录设备信息的事件日期 | 从分析引擎查询|
|`mobile_brand_name`| 维度 | 设备的品牌名称  | 从分析引擎查询|
|`mobile_model_name`| 维度 | 设备的型号名称 | 从分析引擎查询|
|`manufacturer`| 维度 | 设备的制造商 | 从分析引擎查询|
|`network_type`| 维度 | 用户记录事件时的网络类型  | 从分析引擎查询|
|`operating_system`| 维度 | 设备的操作系统  | 从分析引擎查询|
|`operating_system_version`| 维度 | 设备的操作系统版本  | 从分析引擎查询|
|`screen_height`| 维度 | 设备的屏幕高度  | 从分析引擎查询|
|`screen_width`| 维度 | 设备的屏幕宽度  | 从分析引擎查询|
|`Screen Resolution`| 维度 | 设备的屏幕分辨率（即屏幕高度 x 屏幕宽度）  | QuickSight 中的计算字段|
|`system_language`| 维度 | 解决方案的系统语言  | 从分析引擎查询|
|`us_browser`| 维度 | 从用户代理派生的浏览器  | 从分析引擎查询|
|`us_browser_version`| 维度 | 从用户代理派生的浏览器版本  | 从分析引擎查询|
|`us_os`| 维度 | 从用户代理派生的操作系统  | 从分析引擎查询|
|`us_device`| 维度 | 从用户代理派生的设备  | 从分析引擎查询|
|`us_device_category`| 维度 | 从用户代理派生的设备类别  | 从分析引擎查询|
|`usage_num`| 指标 | 记录设备 ID 的事件数量  | 从分析引擎查询|

## 示例仪表板
以下图片是一个示例仪表板供您参考。

![设备仪表板](../../images/analytics/dashboard/device.png)
