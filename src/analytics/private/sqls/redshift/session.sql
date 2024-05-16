CREATE TABLE IF NOT EXISTS {{schema}}.session (
    event_timestamp timestamp not null,
    user_pseudo_id varchar(255) not null,
    session_id varchar(255) not null,
    user_id varchar(255),
    session_number bigint,
    session_start_time_msec bigint,
    -- METADATA {"name":"session_source","dataType":"string","scanValue":"true","category":"{{{category_event_outer}}}","displayName":{"en-US":"Session Source","zh-CN":"会话来源"},"description":{"en-US":"The source of the session","zh-CN":"会话的来源"}}
    session_source varchar(255),
    -- METADATA {"name":"session_medium","dataType":"string","scanValue":"true","category":"{{{category_event_outer}}}","displayName":{"en-US":"Session Medium","zh-CN":"会话媒介"},"description":{"en-US":"The medium of the session","zh-CN":"会话的媒介"}}
    session_medium varchar(255),
    -- METADATA {"name":"session_campaign","dataType":"string","scanValue":"true","category":"{{{category_event_outer}}}","displayName":{"en-US":"Session Campaign","zh-CN":"会话广告系列"},"description":{"en-US":"The campaign of the session","zh-CN":"会话的广告系列"}}
    session_campaign varchar(255),
    -- METADATA {"name":"session_content","dataType":"string","scanValue":"false","category":"{{{category_event_outer}}}","displayName":{"en-US":"Session Content","zh-CN":"会话内容"},"description":{"en-US":"The content of the session","zh-CN":"会话的内容"}}
    session_content varchar(2048),
    -- METADATA {"name":"session_term","dataType":"string","scanValue":"false","category":"{{{category_event_outer}}}","displayName":{"en-US":"Session Term","zh-CN":"会话关键词"},"description":{"en-US":"The term of the session","zh-CN":"会话的关键词"}}
    session_term varchar(2048),
    -- METADATA {"name":"session_campaign_id","dataType":"string","scanValue":"false","category":"{{{category_event_outer}}}","displayName":{"en-US":"Session CLID","zh-CN":"会话CLID"},"description":{"en-US":"The CLID of the session","zh-CN":"会话的CLID"}}
    session_campaign_id varchar(255),
    -- METADATA {"name":"session_clid_platform","dataType":"string","scanValue":"false","category":"{{{category_event_outer}}}","displayName":{"en-US":"Session CLID Platform","zh-CN":"会话CLID平台"},"description":{"en-US":"The platform of the CLID of the session","zh-CN":"会话的CLID平台"}}
    session_clid_platform varchar(255),
    -- METADATA {"name":"session_clid","dataType":"string","scanValue":"false","category":"{{{category_event_outer}}}","displayName":{"en-US":"Session Channel Group","zh-CN":"会话渠道组"},"description":{"en-US":"The channel group of the session","zh-CN":"会话的渠道组"}}
    session_clid varchar(2048),
    -- METADATA {"name":"session_channel_group","dataType":"string","scanValue":"true","category":"{{{category_event_outer}}}","displayName":{"en-US":"Session Channel Group","zh-CN":"会话渠道组"},"description":{"en-US":"The channel group of the session","zh-CN":"会话的渠道组"}}
    session_channel_group varchar(255),
    -- METADATA {"name":"session_source_category","dataType":"string","scanValue":"true","category":"{{{category_event_outer}}}","displayName":{"en-US":"Session Source Category","zh-CN":"会话来源类别"},"description":{"en-US":"The source category of the session","zh-CN":"会话的来源类别"}}
    session_source_category varchar(255),
    process_info super,
    created_time timestamp DEFAULT getdate()
) BACKUP YES DISTSTYLE EVEN SORTKEY (user_pseudo_id, session_id, event_timestamp);