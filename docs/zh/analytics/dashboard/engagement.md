# 用户参与度报告
您可以使用用户参与度报告了解用户如何与您的网站和应用程序互动。它显示了有关用户参与度水平、执行活动以及访问最多的页面/屏幕的指标。

注意:本文描述了默认报告。您可以通过应用筛选器或比较,或者在 QuickSight 中更改维度、指标或图表来自定义报告。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)

## 查看报告
1. 访问您的应用程序的仪表板。请参阅[访问仪表板](index.md)
2. 在仪表板中,单击名为 **`Engagement`** 的工作表。

## 数据源
用户参与度报告基于以下 QuickSight 数据集创建:

|QuickSight 数据集|Redshift 视图/表|描述|
|----------------|-----------------|--------------------|
|`Engagement_KPI-<app>-<project>`|`clickstream_engagement_kpi`|此数据集存储每天的用户参与度关键绩效指标数据。|
|`Day_Event_View_Engagement-<app>-<project>`|`clickstream_engagement_day_event_view`|此数据集存储每天的事件数量和视图事件数量数据。|
|`Event_Name-<app>-<project>`|`clickstream_engagement_event_name`|此数据集存储每个用户每天的事件名称事件数量数据。|
|`Page_Screen_View-<app>-<project>`|`clickstream_engagement_page_screen_view`|此数据集存储每天每个页面或屏幕的视图数量数据。|
|`Page_Screen_View_Detail-<app>-<project>`|`clickstream_engagement_page_screen_detail_view`|此数据集存储每个用户每天的页面标题/页面 URL 或屏幕名称/屏幕 ID 的视图事件数据。|

## 维度
用户参与度报告包括以下维度。

|维度|描述|如何填充|
|----|----|-------|
|事件名称|用户触发的事件名称|根据您使用 Clickstream SDK 或 HTTP API 为事件设置的事件名称派生。|
|页面标题|网页的标题|页面标题源自您 HTML 中的 `title` 标签。|
|页面 URL 路径|网页 URL 中的路径|页面路径源自域名之后的值。例如,如果有人访问 `www.example.com/books`,则 `example.com` 是域名, `/books` 是页面路径。|
|屏幕名称|屏幕的标题|屏幕名称源自您使用 clickstream SDK 或 HTTP API 为屏幕设置的名称。|
|屏幕类|屏幕的类名|屏幕类源自当前处于焦点的 UIViewController 或 Activity 的类名。|

## 指标
用户参与度报告包括以下指标。

|指标|定义|计算方式|
|----|----|-------|
|Avg_session_per_user|每个活跃用户的平均会话数。|总会话数/活跃用户总数|
|Avg_engagement_time_per_user_minute|您的网站在用户浏览器中处于焦点状态或应用程序在用户设备的前台的平均时间(每用户)。|总用户参与时长/活跃用户数|
|Avg_engagement_time_per_session_minute|您的网站在用户浏览器中处于焦点状态或应用程序在用户设备的前台的平均时间(每会话)。|总用户参与时长/会话数|
|Active users|具有 page_view 或 screen_view 事件的活跃用户数。|当 event_name 为 '_page_view' 或 '_screen_view' 时,计算不同的 user_id 或 user_pseudo_id(如果 user_id 不可用)的数量。|
|Event count|用户触发 '_page_view' 或 '_screen_view' 事件的次数。|当 event_name 为 '_page_view' 或 '_screen_view' 时,计算 event_id 的数量。|
|Event count per user|每个用户的平均事件计数。|Event count / Active users|

## 示例仪表板
以下图像是供您参考的示例仪表板。

![dashboard-activity](../../images/analytics/dashboard/engagement.png)