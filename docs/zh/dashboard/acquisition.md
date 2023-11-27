# 流量获取报表 
您可以使用流量获取报表来了解新用户首次如何找到您的网站或应用程序。该报表还允许您查看详细的用户资料。

注意：本文介绍了默认报表。您可以通过应用过滤器或比较，或者通过更改QuickSight中的维度、指标或图表来自定义报表，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)。

## 查看报表

1. 访问您的应用程序的仪表板。请参阅[访问仪表板](index.md)。
2. 在仪表板中，点击名称为 **`Acquisition`**（流量获取） 的表单。

## 数据来源

流量获取报表是基于QuickSight数据集`user_dim_view-<app>-<project>`创建的，该数据集连接到分析引擎（即Redshift或Athena）中的`clickstream_user_dim_view`视图。以下是生成该视图的SQL命令。

??? example "SQL 命令"
    === "Redshift"
        ```sql title="clickstream-user-dim-view.sql"
        --8<-- "src/analytics/private/sqls/redshift/clickstream-user-dim-view.sql:6"
        ```
    === "Athena"
        ```sql title="clickstream-user-dim-query.sql"
        --8<-- "src/analytics/private/sqls/athena/clickstream-user-dim-query.sql"
        ```

## 维度和指标
该报表包含以下维度和指标，您可以通过在 QuickSight 数据集中创建“calculated field”（计算字段）来添加更多维度或指标，[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

| 字段                            | 类型| 解释                            | 如何生成      |
|-------------------------------|----|-------------------------------|-----------|
| `user_pseudo_id`              | 维度 | SDK 为用户生成的唯一 ID               | 来自分析引擎的查询 |
| `user_id`                     | 维度 | SDK中通过setUserId接口设置的用户ID      | 来自分析引擎的查询 |
| `first_visit_date`            | 维度 | 用户首次访问您的网站或首次打开应用程序的日期        | 来自分析引擎的查询 |
| `first_install_source`        | 维度 | 用户首次打开您的应用时的安装源，网页则为空         | 来自分析引擎的查询 |
| `first_visit_device_language` | 维度 | 设备用户首次打开您的应用程序或首次访问您的网站时使用的系统语言 | 来自分析引擎的查询 |
| `first_visit_device_language` | 维度 | 设备用户首次打开您的应用程序或首次访问您的网站时使用的系统语言 | 来自分析引擎的查询 |
| `first_platform`              | 维度 | 用户首次访问您的网站或首次打开您的应用程序时的平台     | 来自分析引擎的查询 |
| `first_visit_country`         | 维度| 用户首次访问您的网站或首次打开您的应用的国家/地区     | 来自分析引擎的查询 |
| `first_visit_city`            | 维度 | 用户首次访问您的网站或首次打开您的应用的城市        | 来自分析引擎的查询 |
| `custom_attr_key`             | 维度| 用户自定义属性键的名称                   | 来自分析引擎的查询 |
| `custom_attr_value`           | 维度| 用户自定义属性键的值                    | 来自分析引擎的查询 |
| `is_registered`               | 维度| 用户是否注册                        | 来自分析引擎的查询 |


## 示例仪表板
以下图片是一个示例仪表板供您参考。

![qs-acquisition](../images/analytics/dashboard/acquisition.png)




