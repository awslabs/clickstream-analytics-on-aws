import enums

sampleAppEvent = {
    "event_type": "",
    "event_id": "",
    "app_id": "",
    "unique_id": "",
    "timestamp": 0,
    "device_id": "",
    "platform": "",
    "os_version": "",
    "make": "",
    "brand": "",
    "model": "",
    "locale": "",
    "carrier": "",
    "network_type": "",
    "screen_height": 0,
    "screen_width": 0,
    "zone_offset": 0,
    "system_language": "",
    "country_code": "",
    "sdk_version": "",
    "sdk_name": "aws-solution-clickstream-sdk",
    "app_version": "",
    "app_package_name": "com.shopping.app",
    "app_title": "shopping",
    "user": {
        "_user_first_touch_timestamp": {
            "value": 0,
            "set_timestamp": 0
        },
    },
    "attributes": {
        "_session_id": "",
        "_session_start_timestamp": 0,
        "_session_duration": 0,
        "_session_number": 0,
        "_channel": "",
        "_traffic_source_source": "",
        "_traffic_source_medium": "",
        "_screen_name": "",
        "_screen_id": ""
    }
}

sampleWebEvent = {
    "event_type": "",
    "event_id": "",
    "app_id": "",
    "unique_id": "",
    "timestamp": 0,
    "device_id": "",
    "platform": "Web",
    "make": "",
    "locale": "",
    "screen_height": 0,
    "screen_width": 0,
    "viewport_height": 0,
    "viewport_width": 0,
    "zone_offset": 0,
    "system_language": "",
    "country_code": "",
    "sdk_version": "",
    "sdk_name": "aws-solution-clickstream-sdk",
    "host_name": enums.host_name,
    "user": {
        "_user_first_touch_timestamp": {
            "value": 0,
            "set_timestamp": 0
        },
    },
    "attributes": {
        "_session_id": "",
        "_session_start_timestamp": 0,
        "_session_duration": 0,
        "_session_number": 0,
        "_traffic_source_source": "",
        "_traffic_source_medium": "",
        "_latest_referrer": "",
        "_latest_referrer_host": "",
        "_page_title": "",
        "_page_url": ""
    }
}
