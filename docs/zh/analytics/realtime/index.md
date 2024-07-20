# 实时分析
实时分析让您能以秒级延迟查看您网站或应用的点击流数据。

## 先决条件
1. 您必须为项目的数据管道启用实时分析。
2. 您必须为应用启用实时流式处理。

## 启动和停止
您可以通过切换开关来启动和停止实时数据流，以避免不必要的成本。在后端，此选项启动和停止处理点击流事件的Flink应用程序。

## 数据源和指标
实时报告基于以下QuickSight数据集创建：

|QuickSight数据集 | Redshift视图 / 表格| 指标描述 |
|----------|--------------------|------------------|
|`Realtime_Event_Country-rt-<app>-<project>`|`ods_events_streaming_view` | 此数据集存储过去一小时内您网站或应用按国家划分的活跃用户数。|
|`Realtime_Event_City-rt-<app>-<project>`|`ods_events_streaming_view` | 此数据集存储过去一小时内您网站或应用按城市划分的活跃用户数。|
|`Realtime_Event_Platform-rt-<app>-<project>`|`ods_events_streaming_view` | 此数据集存储过去一小时内您网站或应用按平台划分的活跃用户数。|
|`Realtime_Event_Name-rt-<app>-<project>`|`ods_events_streaming_view` | 此数据集存储过去一小时内您网站或应用按事件名称划分的活跃用户数。|
|`Realtime_Event_Page_Screen-rt-<app>-<project>`|`ods_events_streaming_view` | 此数据集存储过去一小时内您网站或应用按页面标题或屏幕名称划分的活跃用户数。|
|`Realtime_Event_Traffic-rt-<app>-<project>`|`ods_events_streaming_view` | 此数据集存储过去一小时内您网站或应用按流量来源划分的活跃用户数。|
|`Realtime_Event_User-rt-<app>-<project>`|`ods_events_streaming_view` | 此数据集存储过去一小时内您网站或应用按每分钟划分的活跃用户数。|