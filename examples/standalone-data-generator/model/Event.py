"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
import random

import configure
import enums as enums
import util.util as utils
from model import EventSample, ScreenEvent, Screen
from model.EventType import EventType


def get_event_for_user(user):
    if user.platform == enums.Platform.Web:
        event = EventSample.sampleWebEvent
        event["device_id"] = user.device_web.device_id
        event["make"] = user.device_web.make
        event["locale"] = user.device_web.locale
        event["screen_height"] = user.device_web.screen_height
        event["screen_width"] = user.device_web.screen_width
        event["viewport_height"] = user.device_web.viewport_height
        event["viewport_width"] = user.device_web.viewport_width
        event["zone_offset"] = user.device_web.zone_offset
        event["system_language"] = user.device_web.system_language
        event["country_code"] = user.device_web.country_code
    else:
        # todo add switch to web logic
        event = EventSample.sampleAppEvent
        event["device_id"] = user.mobile_device.device_id
        event["platform"] = user.platform
        event["os_version"] = user.mobile_device.os_version
        event["make"] = user.mobile_device.make
        event["brand"] = user.mobile_device.brand
        event["model"] = user.mobile_device.model
        event["locale"] = user.mobile_device.locale
        event["carrier"] = user.mobile_device.carrier
        event["network_type"] = user.mobile_device.network_type
        event["screen_height"] = user.mobile_device.screen_height
        event["screen_width"] = user.mobile_device.screen_width
        event["zone_offset"] = user.mobile_device.zone_offset
        event["system_language"] = user.mobile_device.system_language
        event["country_code"] = user.mobile_device.country_code
        event["attributes"]["_channel"] = user.channel
        event["app_version"] = user.app.app_version
    event["unique_id"] = user.user_unique_id
    event["app_id"] = configure.APP_ID
    event["sdk_version"] = user.app.sdk_version

    if user.is_login:
        user_id = {
            "value": user.user_id,
            "set_timestamp": user.login_timestamp
        }
        event["user"]["_user_id"] = user_id
    else:
        if "_user_id" in event["user"]:
            del event["user"]["_user_id"]
    if user.first_touch_timestamp > 0:
        event["user"]["_user_first_touch_timestamp"]["value"] = user.first_touch_timestamp
        event["user"]["_user_first_touch_timestamp"]["set_timestamp"] = user.first_touch_timestamp
    else:
        event["user"]["_user_first_touch_timestamp"]["value"] = 0
        event["user"]["_user_first_touch_timestamp"]["set_timestamp"] = 0
    return event


def get_new_session_id(unique_id, current_timestamp):
    day = utils.get_session_id_of_timestamp(current_timestamp)
    return unique_id[-8:] + "-" + day


def get_final_event(user, event_type, event):
    event["event_type"] = event_type
    uuid = utils.get_unique_id()
    event["event_id"] = uuid
    event["timestamp"] = user.current_timestamp
    start_timestamp = event["attributes"]["_session_start_timestamp"]
    event["attributes"]["_session_duration"] = user.current_timestamp - start_timestamp
    platform = user.platform
    if user.current_page_type != '':
        if platform == enums.Platform.Web:
            event["attributes"]["_page_title"] = user.current_page[0]
            event["attributes"]["_page_url"] = user.current_page[1]
        else:
            event["attributes"]["_screen_name"] = user.current_page[0]
            event["attributes"]["_screen_id"] = user.current_page[1]
    user.current_timestamp += random.randint(1, 100)
    return event


def get_launch_events(user, event):
    user.current_page_type = ''
    user.current_page = ('', '')
    user.current_page_start_time = 0
    ScreenEvent.clear()
    events = []
    # handle traffic_source
    traffic_source = enums.traffic_source.get_random_item()
    event["attributes"]["_traffic_source_source"] = traffic_source[0]
    event["attributes"]["_traffic_source_medium"] = traffic_source[1]
    # generate latest referrer for web
    if user.platform == enums.Platform.Web:
        referrer = enums.latest_referrer.get_random_item()
        event["attributes"]["_latest_referrer"] = referrer[0]
        event["attributes"]["_latest_referrer_host"] = referrer[1]
    # handle first open
    if user.is_first_open:
        event["attributes"]["_session_start_timestamp"] = user.current_timestamp
        event["user"]["_user_first_touch_timestamp"]["value"] = user.current_timestamp
        event["user"]["_user_first_touch_timestamp"]["set_timestamp"] = user.current_timestamp
        events.append(get_final_event(user, EventType.FIRST_OPEN, clean_event(event)))
        user.is_first_open = False
        user.first_touch_timestamp = user.current_timestamp
    # add user attribute if user is login
    if user.is_login:
        user_id = {
            "value": user.user_id,
            "set_timestamp": user.login_timestamp
        }
        user_name = {
            "value": user.name,
            "set_timestamp": user.login_timestamp
        }
        event["user"]["_user_id"] = user_id
        event["user"]["_user_name"] = user_name

    # handle session
    user.session_number += 1
    new_session_id = get_new_session_id(event["unique_id"], user.current_timestamp)
    event["attributes"]["_session_start_timestamp"] = user.current_timestamp
    event["attributes"]["_session_id"] = new_session_id
    event["attributes"]["_session_number"] = user.session_number
    events.append(get_final_event(user, EventType.SESSION_START, clean_event(event)))

    app_start_event = clean_event(event)
    app_start_event["attributes"]["_is_first_time"] = True
    events.append(get_final_event(user, EventType.APP_START, app_start_event))

    # add splash screen view for app
    if user.platform != enums.Platform.Web:
        events.extend(ScreenEvent.get_enter_new_screen_events(user, event, Screen.Page.SPLASH))
        user.current_timestamp += 1100
    return events


# get the user in current screen events
def get_screen_events(user, event, page):
    events = []
    next_page = ''
    if page != Screen.Page.EXIT:
        events.extend(ScreenEvent.get_enter_new_screen_events(user, event, page))
        result = ScreenEvent.get_page_events(user, event, page)
        events.extend(result[0])
        next_page = result[1]
    else:
        events.extend(ScreenEvent.get_exit_app_events(user, event))
    return events, next_page


def clean_event(event):
    new_event = event.copy()
    attributes = event["attributes"].copy()
    user = event["user"].copy()
    if "_previous_screen_name" in attributes:
        del attributes["_previous_screen_name"]
    if "_previous_screen_id" in attributes:
        del attributes["_previous_screen_id"]
    if "_page_referrer_title" in attributes:
        del attributes["_page_referrer_title"]
    if "_page_referrer" in attributes:
        del attributes["_page_referrer"]
    if "_engagement_time_msec" in attributes:
        del attributes["_engagement_time_msec"]
    if "_entrances" in attributes:
        del attributes["_entrances"]
    if "_is_first_time" in attributes:
        del attributes["_is_first_time"]
    if "items" in new_event:
        del new_event["items"]
    new_event["attributes"] = attributes
    new_event["user"] = user
    return new_event
