CREATE TABLE IF NOT EXISTS {{schema}}.event_v2 (
    event_timestamp timestamp not null,
    event_id varchar(255) not null,
    event_time_msec bigint not null,
    event_name varchar(255) not null,
    event_value double precision,
    event_value_currency varchar(32),
    event_bundle_sequence_id bigint,
    ingest_time_msec bigint,
    -- METADATA {"name":"device_mobile_brand_name","dataType":"string","category":"device","displayName":{"en-US":"Mobile brand name","zh-CN":"设备品牌名称"},"description":{"en-US":"Device brand name","zh-CN":"设备品牌名称"}}
    device_mobile_brand_name varchar(255),
    -- METADATA {"name":"device_mobile_model_name","dataType":"string","category":"device","displayName":{"en-US":"Mobile model name","zh-CN":"设备型号名称"},"description":{"en-US":"Device model name","zh-CN":"设备型号名称"}}
    device_mobile_model_name varchar(255),
    -- METADATA {"name":"device_manufacturer","dataType":"string","category":"device","displayName":{"en-US":"Device manufacturer","zh-CN":"设备制造商名称"},"description":{"en-US":"Device manufacturer name","zh-CN":"设备制造商名称"}}
    device_manufacturer varchar(255),
    -- METADATA {"name":"device_carrier","dataType":"string","category":"device","displayName":{"en-US":"Network carrier","zh-CN":"设备网络提供商名称"},"description":{"en-US":"Device carrier name","zh-CN":"设备网络提供商名称"}}
    device_carrier varchar(255),
    -- METADATA {"name":"device_network_type","dataType":"string","category":"device","displayName":{"en-US":"Network type","zh-CN":"设备网络类型"},"description":{"en-US":"Device network type","zh-CN":"设备的网络类型"}}
    device_network_type varchar(255),
    -- METADATA {"name":"device_operating_system","dataType":"string","category":"device","displayName":{"en-US":"Operating system","zh-CN":"操作系统"},"description":{"en-US":"Operating system type","zh-CN":"操作系统"}}
    device_operating_system varchar(255),
    -- METADATA {"name":"device_operating_system_version","dataType":"string","category":"device","displayName":{"en-US":"Operating system version","zh-CN":"操作系统版本"},"description":{"en-US":"Operating system version","zh-CN":"操作系统的版本"}}
    device_operating_system_version varchar(255),
    -- METADATA {"name":"device_vendor_id","dataType":"string","category":"device","displayName":{"en-US":"Device ID","zh-CN":"设备ID"},"description":{"en-US":"For iOS, this is the IDFV or UUID (only if IDFV is not available); For Android, this is the AndroidId or UUID (if AndroidId is not available)","zh-CN":"对于 iOS，这是 IDFV 或 UUID (仅当 IDFV 不可用)；对于安卓来说，这是 AndroidId 或 UUID (仅当 AndroidId 不可用)"}}
    device_vendor_id varchar(255),
    -- METADATA {"name":"device_advertising_id","dataType":"string","category":"device","displayName":{"en-US":"Device advertising ID","zh-CN":"设备广告ID"},"description":{"en-US":"Advertising ID/IDFA","zh-CN":"广告 ID/IDFA"}}
    device_advertising_id varchar(255),
    -- METADATA {"name":"device_system_language","dataType":"string","category":"device","displayName":{"en-US":"Operating system language","zh-CN":"操作系统语言"},"description":{"en-US":"Operating system language","zh-CN":"操作系统的语言"}}
    device_system_language varchar(255),
    -- METADATA {"name":"device_time_zone_offset_seconds","dataType":"number","category":"device","displayName":{"en-US":"Timezone offset","zh-CN":"时差"},"description":{"en-US":"Offset from GMT in seconds","zh-CN":"与 GMT 的偏移量（以秒为单位）"}}
    device_time_zone_offset_seconds int,
    -- METADATA {"name":"device_ua_browser","dataType":"string","category":"device","displayName":{"en-US":"UserAgent browser","zh-CN":"UA浏览器"},"description":{"en-US":"Browser for users to view content, derived from the User Agent string","zh-CN":"用户查看内容的浏览器，从 User Agent 字符串中派生"}}
    device_ua_browser varchar(255),
    -- METADATA {"name":"device_ua_browser_version","dataType":"string","category":"device","displayName":{"en-US":"UserAgent browser version","zh-CN":"UA浏览器版本"},"description":{"en-US":"The version of browser for users to view content, derived from the User Agent string","zh-CN":"用户查看内容的浏览器版本，从 User Agent 字符串中派生"}}
    device_ua_browser_version varchar(255),
    -- METADATA {"name":"device_ua_os","dataType":"string","category":"device","displayName":{"en-US":"UserAgent OS","zh-CN":"UA操作系统"},"description":{"en-US":"The operating system of device for users to view content, derived from the User Agent string","zh-CN":"用户查看内容的设备操作系统，从 User Agent 字符串中派生"}}
    device_ua_os varchar(255),
    -- METADATA {"name":"device_ua_os_version","dataType":"string","category":"device","displayName":{"en-US":"UserAgent OS version","zh-CN":"UA操作系统版本"},"description":{"en-US":"The operating system version of device for users to view content, derived from the User Agent string","zh-CN":"用户查看内容的设备操作系统版本，从 User Agent 字符串中派生"}}
    device_ua_os_version varchar(255),
    -- METADATA {"name":"device_ua_device","dataType":"string","category":"device","displayName":{"en-US":"UserAgent device","zh-CN":"UA设备"},"description":{"en-US":"Device for users to view content, derived from the User Agent string","zh-CN":"用户查看内容的设备，从 User Agent 字符串中派生"}}
    device_ua_device varchar(255),
    -- METADATA {"name":"device_ua_device_category","dataType":"string","category":"device","displayName":{"en-US":"UserAgent device category","zh-CN":"UA设备类别"},"description":{"en-US":"The category of device for users to view content, derived from the User Agent string","zh-CN":"用户查看内容的设备类别，从 User Agent 字符串中派生"}}
    device_ua_device_category varchar(255),
    device_ua super,
    -- METADATA {"name":"device_screen_width","dataType":"number","category":"device","displayName":{"en-US":"Screen width","zh-CN":"屏幕宽度"},"description":{"en-US":"The screen width","zh-CN":"屏幕宽度"}}
    device_screen_width int,
    -- METADATA {"name":"device_screen_height","dataType":"number","category":"device","displayName":{"en-US":"Screen height","zh-CN":"屏幕高度"},"description":{"en-US":"The screen height","zh-CN":"屏幕高度"}}
    device_screen_height int,
    -- METADATA {"name":"device_viewport_width","dataType":"number","category":"device","displayName":{"en-US":"Viewport width","zh-CN":"视区宽度"},"description":{"en-US":"The website viewport width pixel","zh-CN":"视区宽度"}}
    device_viewport_width int,
    -- METADATA {"name":"device_viewport_height","dataType":"number","category":"device","displayName":{"en-US":"Viewport height","zh-CN":"视区高度"},"description":{"en-US":"The website viewport height pixel","zh-CN":"视区高度"}}
    device_viewport_height int,
    -- METADATA {"name":"geo_continent","dataType":"string","category":"geo","displayName":{"en-US":"Continent","zh-CN":"大陆洲名"},"description":{"en-US":"The continent that reporting events based on IP addresses","zh-CN":"基于 IP 地址报告事件的大陆洲名"}}
    geo_continent varchar(255),
    -- METADATA {"name":"geo_sub_continent","dataType":"string","category":"geo","displayName":{"en-US":"Sub continent","zh-CN":"子大陆洲名"},"description":{"en-US":"The sub continent that reporting events based on IP addresses","zh-CN":"基于 IP 地址报告事件的子大陆"}}
    geo_sub_continent varchar(255),
    -- METADATA {"name":"geo_country","dataType":"string","category":"geo","displayName":{"en-US":"Country","zh-CN":"国家"},"description":{"en-US":"The country that reporting events based on IP addresses","zh-CN":"基于 IP 地址报告事件的国家"}}
    geo_country varchar(255),
    -- METADATA {"name":"geo_region","dataType":"string","category":"geo","displayName":{"en-US":"Region","zh-CN":"地区"},"description":{"en-US":"The region that reporting events based on IP addresses","zh-CN":"基于 IP 地址报告事件的地区"}}
    geo_region varchar(255),
    geo_metro varchar(255),
    -- METADATA {"name":"geo_city","dataType":"string","category":"geo","displayName":{"en-US":"City","zh-CN":"城市"},"description":{"en-US":"The city that reporting events based on IP addresses","zh-CN":"基于 IP 地址报告事件的城市"}}
    geo_city varchar(255),
    -- METADATA {"name":"geo_locale","dataType":"string","category":"geo","displayName":{"en-US":"Locale","zh-CN":"地理编号"},"description":{"en-US":"The locale that reporting events based on IP addresses","zh-CN":"基于 IP 地址报告事件的地理编号"}}
    geo_locale varchar(255),
    -- METADATA {"name":"traffic_source_source","dataType":"string","category":"traffic_source","displayName":{"en-US":"Traffic source","zh-CN":"流量来源"},"description":{"en-US":"Traffic source. Name of the network source that acquired the user when the event were reported. Example: Google, Facebook, Bing, Baidu","zh-CN":"流量来源，事件报告时获取的网络来源的名称，例如：Google, Facebook, Bing, Baidu"}}
    traffic_source_source varchar(255),
    -- METADATA {"name":"traffic_source_medium","dataType":"string","category":"traffic_source","displayName":{"en-US":"Traffic source medium","zh-CN":"流量媒介"},"description":{"en-US":"Traffic medium. Use this attribute to store the medium that acquired user when events were logged. Example: Email, Paid search, Search engine","zh-CN":"流量媒介，存储事件记录时获取用户的媒介，例如：电子邮件、付费搜索、搜索引擎"}}
    traffic_source_medium varchar(255),
    -- METADATA {"name":"traffic_source_campaign","dataType":"string","category":"traffic_source","displayName":{"en-US":"Traffic source campaign name","zh-CN":"活动名称"},"description":{"en-US":"Traffic source campaign name. Use this attribute to store the marketing campaign that acquired user when events were logged. Example: Summer promotion","zh-CN":"活动名称，存储事件记录时获取用户的营销活动，例如：夏季促销"}}
    traffic_source_campaign varchar(255),
    -- METADATA {"name":"traffic_source_content","dataType":"string","category":"traffic_source","displayName":{"en-US":"Traffic source campaign content","zh-CN":"活动内容"},"description":{"en-US":"Traffic source campaign content.","zh-CN":"活动内容"}}
    traffic_source_content varchar(2048),
    -- METADATA {"name":"traffic_source_term","dataType":"string","category":"traffic_source","displayName":{"en-US":"Traffic source campaign term","zh-CN":"流量来源关键词"},"description":{"en-US":"Traffic source campaign term.","zh-CN":"流量来源关键词"}}
    traffic_source_term varchar(2048),
    -- METADATA {"name":"traffic_source_campaign_id","dataType":"string","category":"traffic_source","displayName":{"en-US":"Traffic source campaign ID","zh-CN":"活动编号"},"description":{"en-US":"Traffic source campaign id.","zh-CN":"活动编号"}}
    traffic_source_campaign_id varchar(255),
    -- METADATA {"name":"traffic_source_clid_platform","dataType":"string","category":"traffic_source","displayName":{"en-US":"Click ID Platform","zh-CN":"点击ID平台"},"description":{"en-US":"Click ID Platform","zh-CN":"点击ID平台"}}
    traffic_source_clid_platform varchar(255),
    -- METADATA {"name":"traffic_source_clid_platform","dataType":"string","category":"traffic_source","displayName":{"en-US":"Click ID","zh-CN":"点击ID"},"description":{"en-US":"Click ID","zh-CN":"点击ID"}}
    traffic_source_clid varchar(2048),
    -- METADATA {"name":"traffic_source_channel_group","dataType":"string","category":"traffic_source","displayName":{"en-US":"First visit installation channel","zh-CN":"首次访问安装来源"},"description":{"en-US":"The first-captured channel","zh-CN":"第一个捕获的渠道"}}
    traffic_source_channel_group varchar(255),
    -- METADATA {"name":"traffic_source_category","dataType":"string","category":"traffic_source","displayName":{"en-US":"Traffic source category","zh-CN":"流量源类别"},"description":{"en-US":"Traffic source category","zh-CN":"流量源类别"}}
    traffic_source_category varchar(255),
    user_first_touch_time_msec bigint,
    -- METADATA {"name":"app_package_id","dataType":"string","category":"app_info","displayName":{"en-US":"Package/Bundle ID","zh-CN":"软件包名"},"description":{"en-US":"The package name or Bundle ID of the application","zh-CN":"应用程序的软件包名称或 Bundle ID"}}
    app_package_id varchar(255),
    -- METADATA {"name":"app_version","dataType":"string","category":"app_info","displayName":{"en-US":"App version","zh-CN":"应用程序版本"},"description":{"en-US":"Version Name of the application","zh-CN":"应用程序的版本号"}}
    app_version varchar(255),
    -- METADATA {"name":"app_title","dataType":"string","category":"app_info","displayName":{"en-US":"App title","zh-CN":"应用程序名称"},"description":{"en-US":"The Name of the application","zh-CN":"应用程序名称"}}
    app_title varchar(255),
    -- METADATA {"name":"app_install_source","dataType":"string","category":"app_info","displayName":{"en-US":"App install source","zh-CN":"应用程序安装商店"},"description":{"en-US":"Store where applications are installed","zh-CN":"安装应用程序的商店"}}
    app_install_source varchar(255),
    -- METADATA {"name":"platform","dataType":"string","category":"outer","displayName":{"en-US":"Platform","zh-CN":"平台"},"description":{"en-US":"The platform of the event","zh-CN":"事件上报的平台"}}
    platform varchar(255),
    -- METADATA {"name":"project_id","dataType":"string","category":"outer","displayName":{"en-US":"Project ID","zh-CN":"项目ID"},"description":{"en-US":"Project ID associated with the application","zh-CN":"与应用相关联的项目ID"}}
    project_id varchar(255) not null,
    -- METADATA {"name":"app_id","dataType":"string","category":"outer","displayName":{"en-US":"App ID","zh-CN":"应用ID"},"description":{"en-US":"The ID of the application in solution","zh-CN":"解决方案中应用程序的ID"}}
    app_id varchar(255) not null,
    -- METADATA {"name":"screen_view_screen_name","dataType":"string","category":"screen_view","displayName":{"en-US":"Screen name","zh-CN":"屏幕名称"},"description":{"en-US":"The screen name","zh-CN":"屏幕名称"}}
    screen_view_screen_name  varchar(255),
    -- METADATA {"name":"screen_view_screen_id","dataType":"string","category":"screen_view","displayName":{"en-US":"Screen ID","zh-CN":"屏幕编号"},"description":{"en-US":"The screen ID","zh-CN":"屏幕编号"}}
    screen_view_screen_id  varchar(255),
    -- METADATA {"name":"screen_view_screen_unique_id","dataType":"string","category":"screen_view","displayName":{"en-US":"Screen unique ID","zh-CN":"屏幕唯一ID"},"description":{"en-US":"The unique ID of screen during rendering","zh-CN":"App渲染屏幕时生成唯一ID"}}
    screen_view_screen_unique_id varchar(255),
    -- METADATA {"name":"screen_view_previous_screen_name","dataType":"string","category":"screen_view","displayName":{"en-US":"Previous screen name","zh-CN":"上一个屏幕名称"},"description":{"en-US":"The previous screen name","zh-CN":"上一个屏幕名称"}}
    screen_view_previous_screen_name varchar(255),
    -- METADATA {"name":"screen_view_previous_screen_id","dataType":"string","category":"screen_view","displayName":{"en-US":"Previous screen ID","zh-CN":"上一个屏幕编号"},"description":{"en-US":"The previous screen ID","zh-CN":"上一个屏幕编号"}}
    screen_view_previous_screen_id  varchar(255),
    -- METADATA {"name":"screen_view_previous_screen_unique_id","dataType":"string","category":"screen_view","displayName":{"en-US":"Previous screen unique ID","zh-CN":"上一个屏幕唯一ID"},"description":{"en-US":"The unique ID of previous screen during rendering","zh-CN":"App渲染上一个屏幕时生成唯一ID"}}
    screen_view_previous_screen_unique_id varchar(255),
    screen_view_previous_time_msec bigint, 
    screen_view_engagement_time_msec bigint,
    -- METADATA {"name":"screen_view_entrances","dataType":"boolean","category":"screen_view","displayName":{"en-US":"Session entry screen or not","zh-CN":"是否会话进入界面"},"description":{"en-US":"The first screen view event in a session is 1, others is 0","zh-CN":"会话中的第一个屏幕浏览事件该值为 1，其他则为 0"}}
    screen_view_entrances bool,
    -- METADATA {"name":"page_view_page_referrer","dataType":"string","category":"page_view","displayName":{"en-US":"Page referrer","zh-CN":"前序页面"},"description":{"en-US":"The url of the previous page","zh-CN":"前一个页面"}}
    page_view_page_referrer  varchar(65535),
    -- METADATA {"name":"page_view_page_referrer_title","dataType":"string","category":"page_view","displayName":{"en-US":"Page referrer title","zh-CN":"前序页面标题"},"description":{"en-US":"The url of the previous page title","zh-CN":"前一个页面标题"}}
    page_view_page_referrer_title varchar(2048),
    page_view_previous_time_msec bigint,
    page_view_engagement_time_msec bigint,
    -- METADATA {"name":"page_view_page_title","dataType":"string","category":"page_view","displayName":{"en-US":"Page title","zh-CN":"页面标题"},"description":{"en-US":"The page title","zh-CN":"页面标题"}}
    page_view_page_title varchar(2048),
    -- METADATA {"name":"page_view_page_url","dataType":"string","category":"page_view","displayName":{"en-US":"Page URL","zh-CN":"页面URL"},"description":{"en-US":"The page URL","zh-CN":"页面URL"}}
    page_view_page_url varchar(65535),
    -- METADATA {"name":"page_view_page_url_path","dataType":"string","category":"page_view","displayName":{"en-US":"Page URL path","zh-CN":"页面URL路径"},"description":{"en-US":"The page URL path","zh-CN":"页面URL路径"}}
    page_view_page_url_path varchar(65535),
    page_view_page_url_query_parameters super,
    -- METADATA {"name":"page_view_hostname","dataType":"string","category":"page_view","displayName":{"en-US":"Host name","zh-CN":"网站主机名"},"description":{"en-US":"The website hostname","zh-CN":"网站主机名"}}
    page_view_hostname varchar(2048),
    -- METADATA {"name":"page_view_latest_referrer","dataType":"string","category":"page_view","displayName":{"en-US":"Latest referrer","zh-CN":"最近一次站外链接"},"description":{"en-US":"Last off-site link","zh-CN":"最近一次站外链接"}}
    page_view_latest_referrer varchar(65535),
    -- METADATA {"name":"page_view_latest_referrer_host","dataType":"string","category":"page_view","displayName":{"en-US":"Latest referrer host","zh-CN":"最近一次站外链接域名"},"description":{"en-US":"Last off-site domain name","zh-CN":"最近一次站外域名"}}
    page_view_latest_referrer_host varchar(2048),
    -- METADATA {"name":"page_view_entrances","dataType":"boolean","category":"page_view","displayName":{"en-US":"Session entry page or not","zh-CN":"是否为会话进入页面"},"description":{"en-US":"The first screen view event in a session is 1, others is 0","zh-CN":"会话中的第一个屏幕浏览事件该值为 1，其他则为 0"}}
    page_view_entrances bool,
    -- METADATA {"name":"app_start_is_first_time","dataType":"boolean","category":"app_info","displayName":{"en-US":"App start first time","zh-CN":"首次打开应用"},"description":{"en-US":"Is the first time open app","zh-CN":"是否是首次打开应用"}}
    app_start_is_first_time bool,
    -- METADATA {"name":"upgrade_previous_app_version","dataType":"string","category":"upgrade","displayName":{"en-US":"Upgrade previous app version","zh-CN":"应用升级前的版本"},"description":{"en-US":"The version before app upgrade.","zh-CN":"应用升级前的版本"}}
    upgrade_previous_app_version varchar(255),
    -- METADATA {"name":"upgrade_previous_os_version","dataType":"string","category":"upgrade","displayName":{"en-US":"Upgrade previous OS version","zh-CN":"操作系统升级前的版本"},"description":{"en-US":"The version before OS upgrade.","zh-CN":"操作系统升级前的版本"}}
    upgrade_previous_os_version varchar(255),
    -- METADATA {"name":"search_key","dataType":"string","category":"search","displayName":{"en-US":"Search key","zh-CN":"搜索关键词"},"description":{"en-US":"The name of the search keyword","zh-CN":"搜索关键词"}}
    search_key varchar(2048),
    -- METADATA {"name":"search_term","dataType":"string","category":"search","displayName":{"en-US":"Search term","zh-CN":"搜索内容"},"description":{"en-US":"The search content","zh-CN":"搜索内容"}}
    search_term varchar(2048),
    -- METADATA {"name":"outbound_link_classes","dataType":"string","category":"outbound","displayName":{"en-US":"Link class","zh-CN":"外链类"},"description":{"en-US":"The content of class in tag <a>","zh-CN":"标签<a>中class里的内容"}}
    outbound_link_classes varchar(2048),
    -- METADATA {"name":"outbound_link_domain","dataType":"string","category":"outbound","displayName":{"en-US":"Outbound Link domain","zh-CN":"外链域名"},"description":{"en-US":"The domain of the outbound link","zh-CN":"外链域名"}}
    outbound_link_domain varchar(2048),
    -- METADATA {"name":"outbound_link_id","dataType":"string","category":"outbound","displayName":{"en-US":"Outbound Link ID","zh-CN":"外链ID"},"description":{"en-US":"The ID of the outbound link","zh-CN":"外链ID"}}
    outbound_link_id varchar(2048),
    -- METADATA {"name":"outbound_link_url","dataType":"string","category":"outbound","displayName":{"en-US":"Outbound Link URL","zh-CN":"外链URL"},"description":{"en-US":"The URL of the outbound link","zh-CN":"外链URL"}}
    outbound_link_url varchar(65535),
    -- METADATA {"name":"outbound_link","dataType":"boolean","category":"outbound","displayName":{"en-US":"Outbound Link","zh-CN":"是否外链"},"description":{"en-US":"If the domain is not in configured domain list, the attribute value is true","zh-CN":"如果该域不在配置的域名列表中，则属性值为true"}}
    outbound_link bool,
    user_engagement_time_msec bigint,
    user_id varchar(255),
    user_pseudo_id varchar(255) not null,
    -- METADATA {"name":"session_id","dataType":"string","category":"session","displayName":{"en-US":"Session ID","zh-CN":"会话ID"},"description":{"en-US":"The session ID","zh-CN":"会话ID"}}
    session_id varchar(255),
    session_start_time_msec bigint,
    -- METADATA {"name":"session_duration","dataType":"number","category":"session","displayName":{"en-US":"Session duration(msec)","zh-CN":"会话时长(毫秒）"},"description":{"en-US":"The session duration in unit of millisecond","zh-CN":"会话持续时间,毫秒为单位"}}
    session_duration bigint,
    -- METADATA {"name":"session_number","dataType":"number","category":"session","displayName":{"en-US":"Session number","zh-CN":"会话编号"},"description":{"en-US":"The session number","zh-CN":"当前用户的会话编号"}}
    session_number bigint,
    scroll_engagement_time_msec bigint,
    -- METADATA {"name":"sdk_error_code","dataType":"string","category":"sdk","displayName":{"en-US":"Data error code","zh-CN":"数据错误代码"},"description":{"en-US":"Error code when clickstream data is invalid","zh-CN":"上报数据时出现错误的代码"}}
    sdk_error_code varchar(255),
    -- METADATA {"name":"sdk_error_message","dataType":"string","category":"sdk","displayName":{"en-US":"Data error message","zh-CN":"数据错误信息"},"description":{"en-US":"Error message when clickstream data is invalid","zh-CN":"上报数据时出现错误的信息"}}
    sdk_error_message varchar(2048),
    -- METADATA {"name":"sdk_version","dataType":"string","category":"sdk","displayName":{"en-US":"SDK version","zh-CN":"SDK版本"},"description":{"en-US":"The version of the SDK","zh-CN":"SDK的版本"}}
    sdk_version varchar(255),
    -- METADATA {"name":"sdk_name","dataType":"string","category":"sdk","displayName":{"en-US":"SDK name","zh-CN":"SDK名称"},"description":{"en-US":"The name of the SDK","zh-CN":"SDK的名称"}}
    sdk_name varchar(255),
    -- METADATA {"name":"app_exception_message","dataType":"string","category":"app_info","displayName":{"en-US":"Exception message","zh-CN":"异常消息"},"description":{"en-US":"The message of exception","zh-CN":"异常事件发出的消息"}}
    app_exception_message varchar(2048),
    -- METADATA {"name":"app_exception_stack","dataType":"string","category":"app_info","displayName":{"en-US":"Exception stack","zh-CN":"异常堆栈信息"},"description":{"en-US":"The stack details of exception","zh-CN":"异常事件捕获的详细堆栈信息"}}
    app_exception_stack varchar(65535),
    custom_parameters_json_str varchar(65535),
    custom_parameters super,
    process_info super,
    created_time timestamp DEFAULT getdate()
) BACKUP YES DISTSTYLE EVEN SORTKEY (event_timestamp);
