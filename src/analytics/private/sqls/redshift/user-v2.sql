CREATE TABLE IF NOT EXISTS {{schema}}.user_v2 (
    event_timestamp timestamp not null,
    user_pseudo_id varchar(255) not null,
    -- METADATA {"name":"user_id","dataType":"string","category":"user_outer","displayName":{"en-US":"User ID","zh-CN":"用户ID"},"description":{"en-US":"The unique ID assigned to a user through setUserId() API， usually the user ID in your business system","zh-CN":"通过 setUserId(）API分配给用户的唯一ID,通常是您业务系统的用户ID"}}
    user_id varchar(255),
    user_properties super,
    user_properties_json_str varchar(65535),
    first_touch_time_msec bigint,
    -- METADATA {"name":"first_visit_date","dataType":"string","category":"user_outer","displayName":{"en-US":"First touch date","zh-CN":"首次访问日期"},"description":{"en-US":"The date when the user first opened the app","zh-CN":"用户首次打开应用程序或访问站点的日期"}}
    first_visit_date DATE,
    -- METADATA {"name":"first_referer","dataType":"string","category":"user_outer","displayName":{"en-US":"First visit referer","zh-CN":"首次访问前序外链地址"},"description":{"en-US":"The referer when the user first opened the app","zh-CN":"用户第一次打开应用程序时的外链"}}
    first_referrer varchar(65535),
    -- METADATA {"name":"first_traffic_source","dataType":"string","category":"user_outer","displayName":{"en-US":"First visit traffic source type","zh-CN":"首次访问流量来源类型"},"description":{"en-US":"The first-captured traffic source","zh-CN":"第一个捕获的流量源"}}
    first_traffic_source varchar(255),
    -- METADATA {"name":"first_traffic_medium","dataType":"string","category":"user_outer","displayName":{"en-US":"First visit traffic source medium","zh-CN":"首次访问流量媒介"},"description":{"en-US":"The first-captured traffic source medium","zh-CN":"第一个捕获的流量媒介"}}
    first_traffic_medium varchar(255),
    -- METADATA {"name":"first_traffic_campaign","dataType":"string","category":"user_outer","displayName":{"en-US":"First visit traffic source campaign","zh-CN":"首次访问流量来源活动"},"description":{"en-US":"The first-captured traffic source campaign","zh-CN":"第一个捕获的流量源活动"}}
    first_traffic_campaign varchar(255),
    -- METADATA {"name":"first_traffic_content","dataType":"string","category":"user_outer","displayName":{"en-US":"First visit traffic source content","zh-CN":"首次访问流量来源内容"},"description":{"en-US":"The first-captured traffic source content","zh-CN":"第一个捕获的流量源内容"}}
    first_traffic_content varchar(2048),
    -- METADATA {"name":"first_traffic_term","dataType":"string","category":"user_outer","displayName":{"en-US":"First visit traffic source term","zh-CN":"首次访问流量来源关键词"},"description":{"en-US":"The first-captured traffic source term","zh-CN":"第一个捕获的流量源关键词"}}
    first_traffic_term varchar(2048),
    -- METADATA {"name":"first_traffic_campaign_id","dataType":"string","category":"user_outer","displayName":{"en-US":"First visit traffic source campaign ID","zh-CN":"首次访问流量来源活动ID"},"description":{"en-US":"The first-captured traffic source campaign ID","zh-CN":"第一个捕获的流量源活动ID"}}
    first_traffic_campaign_id varchar(255),
    -- METADATA {"name":"first_traffic_clid_platform","dataType":"string","category":"user_outer","displayName":{"en-US":"First visit traffic source clid platform","zh-CN":"首次访问流量来源点击平台"},"description":{"en-US":"The first-captured traffic source clid platform","zh-CN":"第一个捕获的流量源点击平台"}}
    first_traffic_clid_platform varchar(255),
    -- METADATA {"name":"first_traffic_clid","dataType":"string","category":"user_outer","displayName":{"en-US":"First visit traffic source clid","zh-CN":"首次访问流量来源点击ID"},"description":{"en-US":"The first-captured traffic source clid","zh-CN":"第一个捕获的流量源点击ID"}}
    first_traffic_clid varchar(2048),
    -- METADATA {"name":"first_traffic_channel_group","dataType":"string","category":"user_outer","displayName":{"en-US":"First visit traffic source channel group","zh-CN":"首次访问流量来源渠道组"},"description":{"en-US":"The first-captured traffic source channel group","zh-CN":"第一个捕获的流量源渠道组"}}
    first_traffic_channel_group varchar(255),
    -- METADATA {"name":"first_traffic_category","dataType":"string","category":"user_outer","displayName":{"en-US":"First visit traffic source category","zh-CN":"首次访问流量来源类别"},"description":{"en-US":"The first-captured traffic source category","zh-CN":"第一个捕获的流量源类别"}}
    first_traffic_category varchar(255),
    -- METADATA {"name":"first_app_install_source","dataType":"string","category":"user_outer","displayName":{"en-US":"First app install source","zh-CN":"首次应用安装来源"},"description":{"en-US":"The first-captured app install source","zh-CN":"第一个捕获的应用安装来源"}}
    first_app_install_source varchar(255),
    process_info super,
    created_time timestamp DEFAULT getdate()
) BACKUP YES DISTSTYLE EVEN SORTKEY (user_pseudo_id, event_timestamp);