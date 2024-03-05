CREATE TABLE IF NOT EXISTS {{schema}}.session (
    user_pseudo_id varchar(255) not null,
    session_id varchar(255) not null,
    user_id varchar(255),
    session_number bigint,
    session_start_time_msec bigint,
    session_source varchar(255),
    session_medium varchar(255),
    session_campaign varchar(255),
    session_content varchar(2048),
    session_term varchar(2048),
    session_campaign_id varchar(255),
    session_clid_platform varchar(255),
    session_clid varchar(2048),
    session_channel_group varchar(255),
    session_source_category varchar(255),
    process_info super,
    created_time timestamp DEFAULT getdate()
) BACKUP YES DISTSTYLE EVEN SORTKEY (user_pseudo_id, session_id);