CREATE TABLE IF NOT EXISTS {{database_name}}.{{schema}}.{{viewName}}(
    event_date date,
    merged_user_id varchar(255),
    platform varchar(255),
    app_version varchar(65535),
    -- device_operating_system varchar(65535),
    -- device_ua_os varchar(65535),
    -- device_operating_system_version varchar(65535),
    -- device_ua_os_version varchar(65535),
    "operating_system / version" varchar(65535),
    device_ua_browser varchar(65535),
    device_screen_resolution varchar(65535), -- device_screen_height x device_screen_width
    event_count bigint,
    update_timestamp timestamp DEFAULT getdate()
)
BACKUP YES
SORTKEY(event_date)