"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
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
