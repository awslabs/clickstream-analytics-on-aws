# 设备报表

您可以使用设备报表深入了解用户在使用您的应用程序或网站时使用的设备。 该报表为您的用户配置文件提供了更多信息。

注意：本文介绍默认报表，您可以通过应用筛选器或比较，或者通过更改 QuickSight 中的维度、指标或图表来自定义报表，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)。

## 查看报表

1. 访问您的应用程序的仪表板。 参考[访问仪表板](index.md)。
2. 在仪表板中，单击名称为 **`Device`** 的工作表。

## 数据从何而来

设备报表是基于以下 QuickSight 数据集创建的：

- `device_view-<app id>-<project id>`，它连接到分析引擎（即 Redshift 或 Athena）中的 `clickstream_device_view` 视图。

下面是生成视图的 SQL 命令。
??? example "SQL 命令"
    === "Redshift"
        ```sql title="clickstream-device-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/clickstream-device-view.sql:6"
        ```
    === "Athena"
        ```sql title="clickstream-device-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-device-query.sql"
        ```

## 维度和指标

该报表包含以下维度和指标，您可以通过在 QuickSight 数据集中创建“calculated field”（计算字段）来添加更多维度或指标，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

| 字段                         | 类型  | 解释                                                  | 如何生成              |
| -------------------------- | --- | --------------------------------------------------- | ----------------- |
| `device_id`                | 维度  | 设备的唯一ID，设备id的获取方式请参考[SDK手册](../sdk-manual/index.md) | QuickSight聚合      |
| `user_pseudo_id`           | 维度  | SDK 为用户生成的唯一 ID                                     | 来自分析引擎的查询         |
| `user_id`                  | 维度  | SDK中通过setUserId接口设置的用户ID                            | 来自分析引擎的查询         |
| `event_date`               | 维度  | 记录设备信息时的事件数据                                        | 来自分析引擎的查询         |
| `mobile_brand_name`        | 维度  | 设备的品牌名称                                             | 来自分析引擎的查询         |
| `mobile_model_name`        | 维度  | 设备的型号名称                                             | 来自分析引擎的查询         |
| `manufacturer`             | 维度  | 设备制造商                                               | 来自分析引擎的查询         |
| `network_type`             | 维度  | 用户记录事件时的 newtork 类型                                 | 来自分析引擎的查询         |
| `operating_system`         | 维度  | 设备的操作系统                                             | 来自分析引擎的查询         |
| `operating_system_version` | 维度  | 设备的操作系统版本                                           | 来自分析引擎的查询         |
| `screen_height`            | 维度  | 设备屏幕高度                                              | 来自分析引擎的查询         |
| `screen_width`             | 维度  | 设备的屏幕宽度                                             | 来自分析引擎的查询         |
| `Screen Resolution`        | 维度  | 设备的屏幕分辨率（即屏幕高度 x 屏幕宽度）                              | QuickSight 中的计算字段 |
| `system_language`          | 维度  | 解决方案的系统语言                                           | 来自分析引擎的查询         |
| `us_broswer`               | 维度  | 源自用户代理的浏览器                                          | 来自分析引擎的查询         |
| `us_broswer_version`       | 维度  | 源自用户代理的浏览器版本                                        | 来自分析引擎的查询         |
| `us_os`                    | 维度  | 源自用户代理的操作系统                                         | 来自分析引擎的查询         |
| `us_device`                | 维度  | 从用户代理派生的设备                                          | 来自分析引擎的查询         |
| `us_device_category`       | 维度  | 从用户代理派生的设备类别                                        | 来自分析引擎的查询         |
| `usage_num`                | 指标  | 为设备 ID 记录的事件数                                       | 来自分析引擎的查询         |


## 示例仪表板
以下图片是一个示例仪表板供您参考。

![qs-device](../images/analytics/dashboard/device.png)