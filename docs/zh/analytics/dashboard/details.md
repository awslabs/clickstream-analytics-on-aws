# 详细报告
您可以使用详细报告查看单个事件的常见和自定义维度，查询特定用户的所有用户属性，并查看特定用户执行的事件。

注意：本文描述的是默认报告。您可以通过应用过滤器或比较，或通过更改QuickSight中的维度、指标或图表来定制报告。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)

## 查看报告
1. 访问您应用程序的仪表板。请参考[访问仪表板](index.md/#view-dashboards)
2. 在仪表板中，点击名为 **`Details`** 的表格。

## 数据源
详细报告基于以下QuickSight数据集创建：

|QuickSight 数据集 | Redshift 视图 / 表| 描述 | 
|----------|--------------------|------------------|
|`Event_View-<app>-<project>`|`clickstream_event_view_v3`| 该数据集存储所有与用户属性和会话属性关联的原始事件数据。|

## 维度

此报告包括事件、用户和会话表里的所有可用维度。请参考[数据模式](../../pipeline-mgmt/data-processing/data-schema.md)了解每个维度。

## 指标
默认情况下，该报告不包含任何指标。您可以通过在QuickSight数据集中创建`计算字段`添加更多维度或指标。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html)。

## 示例仪表板
下图是一个供您参考的示例仪表板。

![dashboard-user](../../images/analytics/dashboard/details.png)

