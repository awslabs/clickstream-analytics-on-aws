# 数据模式
本文介绍了 {{solution_name}} 中的数据模式和格式。该解决方案使用 **基于事件的** 数据模型来存储和分析点击流数据,客户端上的每一个活动(例如,点击、查看)都被建模为一个带有维度的事件,每个维度代表事件的一个参数。所有事件都共享相同的维度,但客户可以灵活地使用 JSON 对象将自定义事件参数作为键值对存储在特殊维度列中,这使用户能够收集特定于其业务的信息。这些 JSON 将存储在特殊数据类型中，方便用户在分析引擎中查询。

## 数据库和表
对于每个项目,该解决方案都会在 Redshift 和 Athena 中创建一个名为 `<project-id>` 的数据库。每个应用程序都将有一个名为 `app_id` 的模式。在 Athena 中,所有表都添加了 app_id、year、month 和 day 的分区。根据事件数据,该解决方案的数据处理模块将创建以下四个基本表:

- **`event-v2`**: 此表存储事件数据,每条记录代表一个单独的事件。 
- **`user-v2`** : 此表存储最新的用户属性,每条记录代表一个访客(匿名用户)。
- **`item-v2`** : 此表存储与项目相关联的事件数据,每条记录代表一个与项目相关联的事件。
- **`session`** : 此表存储会话数据,每条记录代表每个匿名用户的一个会话。


## 列
表中的每一列都代表一个事件、用户或对象的特定参数。请注意,一些参数被嵌套在 Redshift 中的 Super 字段或 Athena 中的 Map 类型字段中,这些字段(例如 custom_parameters、user_properties)包含可重复的参数。所有的表列如下所述。


|**字段名称**|**Redshift数据类型**|**Athena数据类型**|**描述**|
|--------------|------------------------|------------------------|-------------------|
|event_timestamp|TIMESTAMP|TIMESTAMP|客户端记录事件时的时间戳(以微秒为单位, UTC)。|
|event_id|VARCHAR|STRING|事件的唯一ID。|
|event_time_msec|BIGINT|BIGINT|客户端记录事件时的时间(以UNIX时间戳格式,微秒)。|
|event_name|VARCHAR|STRING|事件的名称。|
|event_value|DOUBLE PRECISION|FLOAT|事件的"值"参数的值。|
|event_value_currency|VARCHAR|STRING|与事件关联的值的货币。|
|event_bundle_sequence_id|BIGINT|BIGINT|这些事件上传的包的顺序ID。|
|ingest_time_msec|BIGINT|BIGINT|事件被服务器接收时的时间(以UNIX时间戳格式,微秒)。|
|device.mobile_brand_name|VARCHAR|STRING|设备品牌名称。|
|device.mobile_model_name|VARCHAR|STRING|设备型号名称。|
|device.manufacturer|VARCHAR|STRING|设备制造商名称。|
|device.carrier|VARCHAR|STRING|设备网络供应商名称。|
|device.network_type|VARCHAR|STRING|设备的网络类型,例如WIFI、5G。|
|device.operating_system|VARCHAR|STRING|设备的操作系统。|
|device.operating_system_version|VARCHAR|STRING|操作系统版本。|
|device.vendor_id|VARCHAR|STRING|iOS中的IDFV,Android中的Android ID(如果没有Android ID则为UUID)。|
|device.advertising_id|VARCHAR|STRING|广告ID/IDFA。|
|device.system_language|VARCHAR|STRING|操作系统语言。|
|device.time_zone_offset_seconds|BIGINT|BIGINT|与GMT的时区偏移秒数。|
|device.ua_browser|VARCHAR|STRING|用户浏览内容时使用的浏览器,从用户代理字符串中获得。|
|device.ua_browser_version|VARCHAR|STRING|用户浏览内容时使用的浏览器版本,从用户代理字符串中获得。|
|device.ua_device|VARCHAR|STRING|用户浏览内容时使用的设备,从用户代理字符串中获得。|
|device.ua_device_category|VARCHAR|STRING|用户浏览内容时使用的设备类别,从用户代理字符串中获得。|
|device.ua_os|VARCHAR|STRING|用户浏览内容时使用的设备操作系统,从用户代理字符串中获得。|
|device.ua_os_version|VARCHAR|STRING|用户浏览内容时使用的设备操作系统版本,从用户代理字符串中获得。|
|device.ua|SUPER|MAP|以键值对形式解析的用户代理。|
|device.screen_width|VARCHAR|STRING|设备的屏幕宽度。|
|device.screen_height|VARCHAR|STRING|设备的屏幕高度。|
|device.viewport_width|VARCHAR|STRING|浏览器视口的屏幕宽度。|
|device.viewport_height|VARCHAR|STRING|浏览器视口的屏幕高度。|
|geo.continent|VARCHAR|STRING|根据IP地址,事件报告来自的大陆。|
|geo.sub_continent|VARCHAR|STRING|根据IP地址,事件报告来自的次大陆。|
|geo.country|VARCHAR|STRING|根据IP地址,事件报告来自的国家。|
|geo.region|VARCHAR|STRING|根据IP地址,事件报告来自的地区。|
|geo.metro|VARCHAR|STRING|根据IP地址,事件报告来自的都市区。|
|geo.city|VARCHAR|STRING|根据IP地址,事件报告来自的城市。|
|geo.locale|VARCHAR|STRING|从设备获取的地区信息。|
|traffic_source_source|VARCHAR|STRING|与事件关联的流量来源(来自utm_source)。|
|traffic_source_medium|VARCHAR|STRING|与事件关联的流量媒体(来自utm_medium,如付费搜索、自然搜索、电子邮件等)。|
|traffic_source_campaign|VARCHAR|STRING|与事件关联的营销活动(来自utm_campaign)。|
|traffic_source_content|VARCHAR|STRING|与事件关联的营销活动内容(来自utm_content)。|
|traffic_source_term|VARCHAR|STRING|与事件关联的营销活动术语(来自utm_term)。|
|traffic_source_campaign_id|VARCHAR|STRING|与事件关联的营销活动ID(来自utm_id)。|
|traffic_source_clid|VARCHAR|STRING|与事件关联的点击ID。|
|traffic_source_clid_platform|VARCHAR|STRING|与事件关联的点击ID平台。|
|traffic_source_channel_group|VARCHAR|STRING|与事件关联的渠道组(由流量分类规则分配)。|
|traffic_source_category|VARCHAR|STRING|与事件关联的源类别(即搜索、社交、视频、购物),基于流量源。|
|user_first_touch_time_msec|BIGINT|BIGINT|用户首次接触应用程序或网站的时间(以UNIX时间戳格式,微秒)。|
|app_package_id|VARCHAR|STRING|应用程序的包名或捆绑ID。|
|app_version|VARCHAR|STRING|应用程序的versionName(Android)或短捆绑版本。|
|app_title|VARCHAR|STRING|应用程序的名称。|
|app_id|VARCHAR|STRING|与应用程序关联的应用ID(由此解决方案创建)。|
|app_install_source|VARCHAR|STRING|用户安装应用程序的商店。|
|platform|VARCHAR|STRING|事件来源的数据流平台(Web、iOS或Android)。|
|project_id|VARCHAR|STRING|与应用程序关联的项目ID。|
|screen_view_screen_name|VARCHAR|STRING|与事件关联的屏幕名称。|
|screen_view_screen_id|VARCHAR|STRING|与事件关联的屏幕类ID。|
|screen_view_screen_unique_id|VARCHAR|STRING|与事件关联的唯一屏幕ID。|
|screen_view_previous_screen_name|VARCHAR|STRING|与事件关联的上一个屏幕名称。|
|screen_view_previous_screen_id|VARCHAR|STRING|与事件关联的上一个屏幕类ID。|
|screen_view_previous_screen_unique_id|VARCHAR|STRING|与事件关联的上一个唯一屏幕ID。|
|screen_view_entrances|BOOLEAN|BOOLEAN|屏幕是否为会话的入口视图。|
|page_view_page_referrer|VARCHAR|STRING|引荐页面URL。|
|page_view_page_referrer_title|VARCHAR|STRING|引荐页面标题。|
|page_view_previous_time_msec|BIGINT|BIGINT|上一个page_view事件的时间戳。|
|page_view_engagement_time_msec|BIGINT|BIGINT|上一个page_view事件的持续时间(以毫秒为单位)。|
|page_view_page_title|VARCHAR|STRING|与事件关联的网页标题。|
|page_view_page_url|VARCHAR|STRING|与事件关联的网页URL。| 
|page_view_page_url_path|VARCHAR|STRING|与事件关联的网页URL路径。|
|page_view_page_url_query_parameters|SUPER|MAP|与事件关联的页面URL查询参数的键值对。|
|page_view_hostname|VARCHAR|STRING|与事件关联的网页的主机名。|
|page_view_latest_referrer|VARCHAR|STRING|最新外部引荐URL。|
|page_view_latest_referrer_host|VARCHAR|STRING|最新外部引荐的主机名。|
|page_view_entrances|BOOLEAN|BOOLEAN|该页面是否为会话入口视图。|
|app_start_is_first_time|BOOLEAN|BOOLEAN|应用程序启动是否为新的应用启动。|
|upgrade_previous_app_version|VARCHAR|STRING|应用升级事件前的上一个应用版本。|
|upgrade_previous_os_version|VARCHAR|STRING|操作系统升级事件前的上一个操作系统版本。|
|search_key|VARCHAR|STRING|用户在网站上执行搜索时URL中的关键词名称。|
|search_term|VARCHAR|STRING|用户在网站上执行搜索时URL中的搜索内容。|
|outbound_link_classes|VARCHAR|STRING|与外部链接关联的a标签中class的内容。|
|outbound_link_domain|VARCHAR|STRING|与外部链接关联的a标签中hrf的域名。|
|outbound_link_id|VARCHAR|STRING|与外部链接关联的a标签中id的内容。|
|outbound_link_url|VARCHAR|STRING|与外部链接关联的a标签中href的内容。|
|outbound_link|BOOLEAN|BOOLEAN|链接是否为外部链接。|
|user_engagement_time_msec|BIGINT|BIGINT|用户参与时间持续时间(以毫秒为单位)。|
|user_id|VARCHAR|STRING|通过setUserId()API分配给用户的唯一ID。|
|user_pseudo_id|VARCHAR|STRING|SDK为用户生成的伪匿名ID。|
|session_id|VARCHAR|STRING|与事件关联的会话ID。|
|session_start_time_msec|BIGINT|BIGINT|会话开始时的UNIX时间戳。|
|session_duration|BIGINT|BIGINT|会话持续的时间长度(以毫秒为单位)。|
|session_number|BIGINT|BIGINT|来自客户端生成的会话数量。|
|scroll_engagement_time_msec|BIGINT|BIGINT|用户滚动网页前在网页上的参与时间。|
|sdk_error_code|VARCHAR|STRING|当事件在某种程度上无效时由SDK生成的错误代码。|
|sdk_error_message|VARCHAR|STRING|当事件在某种程度上无效时由SDK生成的错误消息。|
|sdk_version|VARCHAR|STRING|SDK的版本。|
|sdk_name|VARCHAR|STRING|SDK的名称。|
|app_exception_message|VARCHAR|STRING|应用程序崩溃或抛出异常时的异常消息。|
|app_exception_stack|VARCHAR|STRING|应用程序崩溃或抛出异常时的异常堆栈跟踪。|
|custom_parameters_json_str|VARCHAR|STRING|以键值对形式存储的所有自定义事件参数。|
|custom_parameters|SUPER|MAP|以键值对形式存储的所有自定义事件参数。|
|process_info|SUPER|MAP|存储有关数据处理的信息。| 
|created_time|TIMESTAMP|TIMESTAMP|存储有关数据处理的信息。|

### 用户表
|字段名称|Redshift数据类型|Athena数据类型|描述| 
|-----------------------------|-----------|--------|----------------------------------------------------------------------|
|event_timestamp|BIGINT|STRING|收集用户属性时的时间戳。|
|user_id|VARCHAR|STRING|通过`setUserId()`API分配给用户的唯一ID。|
|user_pseudo_id|VARCHAR|STRING|SDK为用户生成的伪匿名ID。|
|user_properties|SUPER|ARRAY|用户的自定义属性。|
|user_properties_json_str|VARCHAR|STRING|用户的属性。|
|first_touch_timestamp|BIGINT|BIGINT|用户首次打开应用程序或访问网站的时间(以微秒为单位)。|
|first_visit_date|Date|Date|用户首次访问的日期。|
|first_referrer|VARCHAR|STRING|检测到的用户的首个引荐来源。|
|first_traffic_source|VARCHAR|STRING|首次为用户获取的网络来源,如Google、Baidu等。|
|first_traffic_source_medium|VARCHAR|STRING|首次为用户获取的网络来源的媒体,如付费搜索、自然搜索、电子邮件等。|
|first_traffic_source_campaign|VARCHAR|STRING|首次为用户获取的营销活动的名称。|
|first_traffic_source_content|VARCHAR|STRING|首次为用户获取的营销活动内容。|
|first_traffic_source_term|VARCHAR|STRING|首次为用户获取的营销广告关键词。|
|first_traffic_source_campaign_id|VARCHAR|STRING|首次为用户获取的营销活动ID。|
|first_traffic_source_clid_platform|VARCHAR|STRING|首次为用户获取的营销活动的点击ID平台。|
|first_traffic_source_clid|VARCHAR|STRING|首次为用户获取的营销活动的点击ID。|
|first_traffic_source_channel_group|VARCHAR|STRING|首次为用户获取的流量来源的渠道组。|
|first_traffic_source_category|VARCHAR|STRING|基于首次为用户获取的流量来源的源类别(即搜索、社交、视频、购物)。|
|first_app_install_source|VARCHAR|STRING|用户的应用安装渠道,如Google Play。|
|process_info|SUPER|MAP|存储有关数据处理的信息。|
|created_time|TIMESTAMP|TIMESTAMP|存储有关数据处理的信息。|

### 会话（Session） 表字段
|字段名称|Redshift数据类型|Athena数据类型|描述|
|-----------------------------|----------------------|-------------------|------------------------------------------------|
|event_timestamp|TIMESTAMP|STRING|事件发生的时间戳。|
|user_pseudo_id|VARCHAR|STRING|SDK为用户生成的伪匿名ID。|
|session_id|VARCHAR|STRING|分配给会话的ID。|
|user_id|VARCHAR|STRING|通过`setUserId()`API分配给用户的唯一ID。|
|session_number|BIGINT|INT|客户端会话的序列号。|
|session_start_time_msec|BIGINT|BIGINT|会话开始的时间(以毫秒为单位)。|
|session_source|VARCHAR|STRING|会话的流量来源。|
|session_medium|VARCHAR|STRING|会话的流量来源媒体。|
|session_campaign|VARCHAR|STRING|会话的流量来源活动。|
|session_content|VARCHAR|STRING|会话的流量来源内容。|
|session_term|VARCHAR|STRING|会话的流量来源术语。|
|session_campaign_id|VARCHAR|STRING|会话的流量来源活动ID。|
|session_clid_platform|VARCHAR|STRING|会话的CLID(点击ID)平台。|
|session_clid|VARCHAR|STRING|会话的CLID(点击ID)。|
|session_channel_group|VARCHAR|STRING|会话的流量来源渠道组。|
|session_source_category|VARCHAR|STRING|会话源的流量来源类别。|
|process_info|SUPER|MAP|其他数据处理信息。|
|created_time|TIMESTAMP|STRING|会话数据创建的时间戳。|

### 对象（Item） 表字段
|字段名称|Redshift数据类型|Athena数据类型|描述|
|-----------------------------|----------------------|-------------------|------------------------------------------------|
|event_timestamp|TIMESTAMP|STRING|事件发生的时间戳。|
|event_id|VARCHAR|STRING|事件的ID。|
|event_name|VARCHAR|STRING|事件的名称。|
|platform|VARCHAR|STRING|与事件关联的平台。|
|user_pseudo_id|VARCHAR|STRING|SDK为用户生成的伪匿名ID。|
|user_id|VARCHAR|STRING|通过`setUserId()`API分配给用户的唯一ID。|
|item_id|VARCHAR|STRING|商品的ID。|
|name|VARCHAR|STRING|商品的名称。|
|brand|VARCHAR|STRING|商品的品牌。|
|currency|VARCHAR|STRING|与商品价格关联的货币。|
|price|DOUBLE PRECISION|DOUBLE|商品的价格。|
|quantity|DOUBLE PRECISION|DOUBLE|事件中商品的数量。|
|creative_name|VARCHAR|STRING|与商品关联的创意的名称。|
|creative_slot|VARCHAR|STRING|与商品关联的创意的插槽。|
|location_id|VARCHAR|STRING|与商品关联的位置的ID。|
|category|VARCHAR|STRING|商品的类别。|
|category2|VARCHAR|STRING|商品的第二类别。|
|category3|VARCHAR|STRING|商品的第三类别。|
|category4|VARCHAR|STRING|商品的第四类别。|
|category5|VARCHAR|STRING|商品的第五类别。|
|custom_parameters_json_str|VARCHAR|STRING|自定义参数的JSON字符串表示。|
|custom_parameters|SUPER|MAP|其他自定义参数。|
|process_info|SUPER|MAP|其他处理信息。|
|created_time|TIMESTAMP|STRING|商品数据创建的时间戳。|

