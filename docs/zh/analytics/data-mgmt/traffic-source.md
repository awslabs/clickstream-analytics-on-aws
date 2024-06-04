# 流量来源
流量来源描述用户到达您网站或应用程序的渠道,例如付费广告、营销活动、搜索引擎和社交网络。本文介绍了{{solution_name}}如何收集和处理流量源数据。

## 流量源数据字段
流量源包括以下关键维度,用于描述用户到达您网站或应用程序的方式。

1. 来源 - 流量的来源地(源,例如谷歌、百度、必应)
2. 介质 - 用户到达您网站/应用程序的方法(介质,例如自然、cpc/ppc、电子邮件)
3. 活动 - 您用于推动流量的特定营销工作(例如活动、创意格式、关键词)。
4. 自动标记点击ID - 广告平台在显示和点击广告时自动生成和附加的参数。(例如,gclid)

{{solution_name}}使用以下维度和字段来跟踪发送事件时的流量源数据:

| 维度 | Clickstream SDK保留的属性 |页面URL中的UTM参数(仅Web) | 数据模式中的字段 |
|-------------|------------|------------|--------------|
|来源 | _traffic_source_source | utm_source | traffic_source_source |
|介质 | _traffic_source_medium | utm_medium | traffic_source_medium |
|活动名称 | _traffic_source_campaign | utm_campaign | traffic_source_campaign |
|活动ID | _traffic_source_id | utm_id | traffic_source_id |
|活动术语 | _traffic_source_term | utm_term | traffic_source_term |
|活动内容 | _traffic_source_content | utm_content | traffic_source_content |
|自动标记点击ID | _traffic_source_clid | (*)clid | traffic_source_clid |
|自动标记点击ID平台 | _traffic_source_clid_platform | 不适用 | traffic_source_clid_platform |
|应用安装来源 | _app_install_channel | 不适用 | app_install_source |

以下两个维度是从上述流量源数据字段中衍生并添加到每个事件中的:

| 维度 | 数据模式中的字段 | 描述 |
|-------------|-----|-----------|
|来源类别 | _traffic_source_category | 基于traffic_source_source和referral域的类别,包括搜索、社交、购物、视频和内部 |
|渠道组 | _traffic_source_channel_group | 渠道组是一组渠道,这是您的流量源的基于规则的类别,例如付费搜索、付费社交。|

## 处理
在数据处理期间,流量源字段值将被填充到每个事件的维度值中,并归因于用户和会话。下面描述了详细步骤。

### 步骤1 - 提取流量源数据
1. 如果预设的流量源属性设置了值,数据处理模块将会将它们的值映射到相应的流量源数据字段中。例如,将_traffic_source_source的值映射到traffic_source_source字段。
2. (仅限网页)如果预设的流量源属性没有值,数据处理模块将把页面URL字段中的utm参数(例如utm_source)和自动标记的点击ID映射到相应的流量源数据字段。例如,将utm_source的值映射到traffic_source_source字段。
3. (仅限网页)如果在上述步骤之后,源维度仍然为空,数据处理模块将检查page_view_latest_referrer字段是否有值,并根据referrer的域从源类别映射表([了解更多](#_6))中查找源值,如果没有匹配的源,它将使用顶级域名作为traffic_source_source维度的值。

### 步骤2 - 添加流量源类别
数据处理模块使用源类别映射表([了解更多](#_6))将源分类为不同的类别(即搜索、购物、视频、社交)。例如,值为"google"或"bing"的源将被归类为搜索类别。

### 步骤3 - 添加渠道组
数据处理模块使用一组预定义的规则([了解更多](#_5)),根据关键流量源维度(主要是源、媒体和活动),将流量分类为不同的组(例如直接、付费搜索、自然搜索)。

### 步骤4 - 为用户和会话填充流量源维度
在处理每个事件的流量源时,数据处理模块会为每个用户和会话填充流量源维度。

1. 用户:如果在用户第一次访问您的网站或应用程序时的第一个有意义的事件(例如first_open、page_view、app_start、app_end)中有流量源数据,那些流量源维度将被分配给相应的用户流量源属性,即first_traffic_source、first_traffic_medium。
2. 会话:当用户启动新会话时,数据处理模块将从会话中第一个有意义事件(例如first_open、page_view、app_start、app_end)的流量源维度中导出会话的流量源维度。

## 配置
{{solution_name}}允许您配置渠道组规则和源类别映射,以自定义流量源处理,以满足您的分析需求。

### 渠道组定义和规则
以下是解决方案用于对流量进行分类的默认渠道组和规则。

| 顺序 | 渠道                     | 描述       | 评估规则     |
|----|-------|:-----------------|:-------------|
| 1    | 直接  | 直接是用户通过保存的链接或输入您的URL到达您网站/应用程序的渠道。  | 1. traffic_source_category, traffic_source_source,traffic_source_medium,traffic_source_campaign,traffic_source_content,traffic_source_term,traffic_source_campaign_id,traffic_source_clid 全部为空/(none) <br> 且 <br> 2. latest_referrer为空。     |
| 2    | 付费搜索                 | 付费搜索是用户通过在必应、百度或谷歌等搜索引擎网站上的广告到达您网站/应用程序的渠道。 | 1. traffic_source_category为搜索 <br> 且 <br> (2. traffic_source_medium匹配正则表达式^(.*cp.*\|ppc\|retargeting\|paid.*)$ <br> 或 clid不为none/空) 。 |
| 3    | 自然搜索  | 自然搜索是用户通过自然搜索结果中的非广告链接到达您网站/应用程序的渠道。| 1. traffic_source_category为搜索 <br> 且 <br> 2. medium为空或none或完全匹配organic。          |
| 4    | 付费社交  | 付费社交是用户通过在Facebook和Twitter等社交网站上的广告到达您网站/应用程序的渠道。| 1. traffic_source_category为社交 <br> 且 <br> (2. traffic_source_medium匹配正则表达式^(.*cp.*\|ppc\|retargeting\|paid.*)$ <br> 或 clid不为none/空).  |
| 5    | 自然社交 | 自然社交是用户通过Facebook或Twitter等社交网站上的非广告链接到达您网站/应用程序的渠道。| 1. traffic_source_category为社交 <br> 或 <br> 2. traffic_source_medium为("social"、"social-network"、"social-media"、"sm"、"social network"、"social media")之一 。|
| 6    | 付费视频  | 付费视频是用户通过在TikTok、Vimeo和YouTube等视频网站上的广告到达您网站/应用程序的渠道。| 1. traffic_source_category为视频(即traffic_source_source或latest_referrer_host匹配视频网站列表) <br> 且 <br> 2. traffic_source_medium匹配正则表达式^(.*cp.*\|ppc\|retargeting\|paid.*)$ <br> 或 clid不为none/空。      |
| 7    | 自然视频 | 自然视频是用户通过YouTube、TikTok或Vimeo等视频网站上的非广告链接到达您网站/应用程序的渠道。 | 1. traffic_source_category为视频 <br> 或 <br> 2. traffic_source_medium匹配正则表达式^(.*video.*)$ 。      |
| 8    | 付费购物 | 付费购物是用户通过在亚马逊或易贝等购物网站或个体零售商网站上的付费广告到达您网站/应用程序的渠道。  | 1. traffic_source_category为购物 <br> 且 <br> (2. traffic_source_medium匹配正则表达式^(.*cp.*\|ppc\|retargeting\|paid.*)$ <br> 或 clid不为none/空 <br> 或 traffic_source_campaign匹配正则表达式^(.*(([\^a-df-z]\|^)shop\|shopping).*)$)。 |
| 9    | 自然购物 | 自然购物是用户通过亚马逊或易贝等购物网站上的非广告链接到达您网站/应用程序的渠道。 | 1. traffic_source_category为购物 <br> 或 <br> 2. traffic_source_campaign匹配正则表达式^(.*(([\^a-df-z]\|^)shop\|shopping).*)$。       |
| 10   | 付费其他 | 付费其他是用户通过广告到达您网站/应用程序的渠道,但不是通过已识别为搜索、社交、购物或视频的广告。                                         | 1. traffic_source_category为none <br> 且 <br> 2. traffic_source_medium匹配正则表达式^(.*cp.*\|ppc\|retargeting\|paid.*)$ 。         |
| 11   | 电子邮件 | 电子邮件是用户通过电子邮件中的链接到达您网站/应用程序的渠道。  | 1. traffic_source_source包含"mail" <br> 或 <br> 2. traffic_source_meidum包含"mail" <br> 或 <br> 3. latest_referrer_host以"mail"开头。        |
| 12   | 短信  | 短信是用户通过短信链接到达您网站/应用程序的渠道。  | 1. traffic_source_source完全匹配sms <br> 或 <br> 2. traffic_source_medium完全匹配"sms"。           |
| 13   | 音频  | 音频是用户通过音频平台(如播客平台)上的广告到达您网站/应用程序的渠道。                                                                     | 1. traffic_source_medium完全匹配audio。     |
| 14   | 移动推送通知 | 移动推送通知是用户在不主动使用应用程序时通过移动设备上的消息链接到达您网站/应用程序的渠道。   | 1. traffic_source_medium以"push"结尾 <br> 或 <br> 2. traffic_source_medium包含"mobile"或"notification"。    |
| 15   | Referral | Referral是用户通过其他网站/应用程序(如博客、新闻网站)上的非广告链接到达。 | 1. latest_referrer 不为空 且 traffic_source_category为none <br> 且 <br> 2. latest referrer_host不是 内部域名。|
| 16    | 内部 | 来自指定内部域名的流量   | 1. latest_referrer_host是内部域名之一       |
| 17    | 未分配 | 无法分配给渠道组的流量。 | 所有其他情况。   |




要创建和编辑渠道组,请转到数据管理 > 流量源选项卡 > 渠道组。

1. 创建新组。
    - 点击`添加新组`按钮。
    - 填写`组名称`、`描述`和`条件`。
    - 点击`重新排序`,通过点击向上箭头或向下箭头调整评估顺序,然后点击应用。
2. 编辑渠道组
    - 选择一个渠道组
    - 点击操作按钮,并选择`查看详情`
    - 更新渠道组,然后点击`确认`。
    - 点击`重新排序`
    - 通过点击向上箭头和向下箭头调整渠道组的顺序。
    - 点击`应用`保存顺序。

### 源类别映射表
{{solution_name}}使用源类别映射表将一些已知源分类为搜索、社交、购物和视频等类别。您还可以为来自内部源的流量源添加内部类别。下面是映射表中各列的描述。

|列名|描述|示例|
|----|----|---|
|域名|引荐URL的主机名。| google.com, baidu.com |
|源名称|流量源的名称。|google,baidu|
|类别|源的类别。|搜索、购物、社交、视频和内部|  
|关键词模式|仅适用于搜索域的引荐URL中的关键词参数名。|q,query,keyword|

要创建和编辑源类别,请转到数据管理 > 流量源选项卡 > 源类别。

1. 创建新类别。
    - 点击`添加新类别`按钮。或者您可以选择一个现有类别,然后点击操作>`复制到新`。
    - 填写`域名`、`源名称`和`类别`。
    - 如果是`搜索`,请填写关键词模式,您可以添加多个。
    - 点击`确认`。
2. 编辑类别记录
    - 选择一个类别记录
    - 点击操作按钮,并选择`查看详情`
    - 更新记录,然后点击`确认`。