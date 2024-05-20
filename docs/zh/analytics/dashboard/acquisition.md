# 获取报告
您可以使用获取报告来了解新用户首次访问您的网站或应用程序的方式以及日常流量来源。

注意：本文介绍了默认报告。您可以通过应用筛选器或比较，或更改QuickSight中的维度、度量或图表来自定义报告。[了解更多](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## 查看报告
1. 访问您的应用程序的仪表板。请参阅[访问仪表板](index.md/#view-dashboards)
2. 在仪表板中，点击名为**`获取`**的工作表。

## 数据源
获取报告是基于以下QuickSight数据集创建的：

|QuickSight数据集| Redshift视图/表| 描述 |
|----------|--------------------|------------------|
|`User_User_View-<app>-<project>`|`clickstream_acquisition_day_user_view_cnt`|此数据集存储了每天网站或应用程序上的新用户数和活跃用户数的数据|
|`Day_Traffic_Source_User-<app>-<project>`|`clickstream_acquisition_day_traffic_source_user`|此数据集存储了每天每种流量来源类型的新用户数|
|`Day_User_Acquisition-<app>-<project>`|`clickstream_acquisition_day_user_acquisition`|此数据集存储了每天每种流量来源类型的新用户数、活跃用户数、会话数、参与会话数和事件数|
|`Country_New_User_Acquisition-<app>-<project>`|`clickstream_acquisition_country_new_user`|此数据集存储了每天每个国家和城市的新用户数|


## 维度
获取报告包括以下维度。

|维度|描述|计算方式|
|----|----|-------|
|首次用户流量来源|获取新用户访问您网站或应用程序的流量来源(例如 google、百度和必应)|流量来源是从 page_url 的 utm 参数(即 utm_source)或流量来源保留属性(即 _traffic_source_source)中获取,或者根据 referrer url 推导而来(仅限网络)。[了解更多](../data-mgmt/traffic-source.md)|
|首次用户流量媒介|获取新用户访问您网站或应用程序的流量媒介(例如有机、付费搜索)|流量媒介是从 page_url 的 utm 参数(即 utm_medium)或流量来源保留属性(即 _traffic_source_medium)中获取,或者根据 referrer url 推导而来(仅限网络)。[了解更多](../data-mgmt/traffic-source.md)|
|首次用户流量活动|获取新用户访问您网站或应用程序的营销活动名称|流量活动是从 page_url 的 utm 参数(即 utm_campaign)和流量来源保留属性(即 _traffic_source_campaign)中获取,或者根据 referrer url 推导而来(仅限网络)。[了解更多](../data-mgmt/traffic-source.md)|
|首次用户流量来源/媒介|获取新用户访问您网站或应用程序的流量来源和媒介组合|与上面的流量来源和流量媒介相同。[了解更多](../data-mgmt/traffic-source.md)|
|首次用户流量渠道组|渠道组是基于规则定义的流量来源。获取新用户访问您网站或应用程序的流量渠道组名称|流量渠道组是根据流量来源和媒介推导而来。[了解更多](../data-mgmt/traffic-source.md)|
|首次用户流量 clid 平台|获取新用户访问您网站或应用程序的点击 ID 平台名称(来自广告平台的自动标记)|流量来源 clid 平台是从 page_url 的 clid 参数和流量来源保留属性(即 _traffic_source_clid_platform)中获取。[了解更多](../data-mgmt/traffic-source.md)|
|首次用户应用安装来源|获取新用户访问您应用程序的应用商店名称,例如 App Store、Google Store|应用安装来源是从流量来源保留属性(即 _app_install_channel)中获取。[了解更多](../data-mgmt/traffic-source.md)|
|会话流量来源|获取用户访问您网站或应用程序新会话的流量来源(例如 google、百度和必应)|流量来源是从 page_url 的 utm 参数(即 utm_source)或流量来源保留属性(即 _traffic_source_source)中获取,或者根据 referrer url 推导而来(仅限网络)。[了解更多](../data-mgmt/traffic-source.md)|
|会话流量媒介|获取用户访问您网站或应用程序新会话的流量媒介(例如有机、付费搜索)|流量媒介是从 page_url 的 utm 参数(即 utm_medium)或流量来源保留属性(即 _traffic_source_medium)中获取,或者根据 referrer url 推导而来(仅限网络)。[了解更多](../data-mgmt/traffic-source.md)|
|会话流量活动|获取用户访问您网站或应用程序新会话的营销活动名称|流量活动是从 page_url 的 utm 参数(即 utm_campaign)和流量来源保留属性(即 _traffic_source_campaign)中获取,或者根据 referrer url 推导而来(仅限网络)。[了解更多](../data-mgmt/traffic-source.md)|
|会话流量来源/媒介|获取用户访问您网站或应用程序新会话的流量来源和媒介组合|与上面的流量来源和流量媒介相同。[了解更多](../data-mgmt/traffic-source.md)|
|会话流量渠道组|渠道组是基于规则定义的流量来源。获取用户访问您网站或应用程序新会话的流量渠道组名称|流量渠道组是根据流量来源和媒介推导而来。[了解更多](../data-mgmt/traffic-source.md)|
|会话流量 clid 平台|获取用户访问您网站或应用程序新会话的点击 ID 平台名称(来自广告平台的自动标记)|流量 clid 平台是从 page_url 的 clid 参数和流量来源保留属性(即 _traffic_source_clid_platform)中获取。[了解更多](../data-mgmt/traffic-source.md)|
|地理国家|用户访问您网站或应用程序时所在的国家|地理位置信息是根据用户 IP 地址推断的。|
|地理城市|用户访问您网站或应用程序时所在的城市|地理位置信息是根据用户 IP 地址推断的。|

## 指标
获取报告包括以下指标。

|指标|定义|计算方式|
|----|----|-------|
|新用户|首次与您的网站互动或启动您的应用程序的用户数量(触发事件:_first_open)。|当 event_name 等于 '_first_open' 时,计算不同的 user_id 或 user_pseudo_id(如果 user_id 不可用)的数量。|
|活跃用户|在选定时间范围内触发任何事件的不同用户数量。|在任何事件中计算不同的 user_id 或 user_pseudo_id(如果 user_id 不可用)的数量。|
|会话|用户创建的会话数量。|计算不同的 session_id 数量。|
|参与会话|持续时间超过 10 秒或有 1 个或更多页面或屏幕视图的会话数量。|如果会话是有效参与,则计算不同的 session_id 数量。|
|参与率|有效参与会话占总会话的百分比。|有效参与会话/总会话数。|
|事件|用户触发事件的次数。|计算 event_id 的数量。|
|平均用户参与时长|您的网站在用户浏览器中处于焦点状态或应用程序在用户设备的前台的平均时间(每用户)。|总用户参与时长/活跃用户数|

## 示例仪表板
以下图像是供您参考的示例仪表板。

![dashboard-acquisition](../../images/analytics/dashboard/acquisition.png)
