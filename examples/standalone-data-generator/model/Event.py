"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
import enums as enums
import util.util as utils
from model.EventType import EventType
from model.Screen import Screen
import random

sampleEvent = {
    "hashCode": "",
    "unique_id": "",
    "event_type": "",
    "event_id": "",
    "app_id": "",
    "timestamp": 0,
    "device_id": "",
    "platform": "Android",
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
    "country": "",
    "country_code": "",
    "sdk_version": "",
    "sdk_name": "aws-solution-clickstream-sdk",
    "app_version": "",
    "app_package_name": "com.example.notepad",
    "app_title": "Notepad",
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
        "_channel": "",
        "_traffic_source_source": "",
        "_traffic_source_medium": ""
    }
}

global_previous_screen_name = ""
global_previous_screen_id = ""
global_engagement_start_time = 0


def get_event_for_user(user):
    event = sampleEvent
    event["unique_id"] = user.user_unique_id
    event["app_id"] = enums.APP_ID
    event["device_id"] = user.device.device_id
    event["os_version"] = user.device.os_version
    event["make"] = user.device.make
    event["brand"] = user.device.brand
    event["model"] = user.device.model
    event["locale"] = user.device.locale
    event["carrier"] = user.device.carrier
    event["network_type"] = user.device.network_type
    event["screen_height"] = user.device.screen_height
    event["screen_width"] = user.device.screen_width
    event["zone_offset"] = user.device.zone_offset
    event["system_language"] = user.device.system_language
    event["country"] = user.device.country
    event["country_code"] = user.device.country_code
    event["sdk_version"] = user.app.sdk_version
    event["app_version"] = user.app.app_version
    event["attributes"]["_channel"] = user.channel
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
    else:
        if "_user_id" in event["user"]:
            del event["user"]["_user_id"]
        if "_user_name" in event["user"]:
            del event["user"]["_user_name"]
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


def get_final_event(event_type, time_stamp, event, screen=None, entrances=0):
    event["event_type"] = event_type
    uuid = utils.get_unique_id()
    event["event_id"] = uuid
    event["timestamp"] = time_stamp
    start_timestamp = event["attributes"]["_session_start_timestamp"]
    event["attributes"]["_session_duration"] = time_stamp - start_timestamp
    if screen is not None:
        global global_previous_screen_name, global_previous_screen_id, global_engagement_start_time
        event["attributes"]["_screen_name"] = screen.value[0]
        event["attributes"]["_screen_id"] = screen.value[1]
        event["attributes"]["_previous_screen_name"] = global_previous_screen_name
        event["attributes"]["_previous_screen_id"] = global_previous_screen_id
        event["attributes"]["_engagement_time_msec"] = time_stamp - global_engagement_start_time
        event["attributes"]["_entrances"] = entrances
        global_previous_screen_name = screen.value[0]
        global_previous_screen_id = screen.value[1]
    event["hashCode"] = uuid[:7]
    return event


def get_launch_events(user, event, current_timestamp):
    global global_engagement_start_time
    global_engagement_start_time = current_timestamp
    events = []
    # handle traffic_source
    traffic_source = enums.traffic_source.get_random_item()
    event["attributes"]["_traffic_source_source"] = traffic_source[0]
    event["attributes"]["_traffic_source_medium"] = traffic_source[1]
    # handle first open
    if user.is_first_open:
        event["attributes"]["_session_start_timestamp"] = current_timestamp
        event["user"]["_user_first_touch_timestamp"]["value"] = current_timestamp
        event["user"]["_user_first_touch_timestamp"]["set_timestamp"] = current_timestamp
        events.append(get_final_event(EventType.FIRST_OPEN, current_timestamp, clean_event(event)))
        user.is_first_open = False
        user.first_touch_timestamp = current_timestamp
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
    new_session_id = get_new_session_id(event["unique_id"], current_timestamp)
    event["attributes"]["_session_start_timestamp"] = current_timestamp
    event["attributes"]["_session_id"] = new_session_id
    events.append(get_final_event(EventType.SESSION_START, current_timestamp, clean_event(event)))
    # add screen view event for first screen
    events.append(get_final_event(EventType.SCREEN_VIEW, current_timestamp, clean_event(event), screen=Screen.NOTEPAD,
                                  entrances=1))
    current_timestamp += random.choices(enums.PER_ACTION_DURATION)[0] * 1000
    return events


def get_exit_events(event, current_timestamp):
    events = []
    global global_engagement_start_time
    if current_timestamp - global_engagement_start_time > 1000:
        user_engagement_event = clean_event(event)
        user_engagement_event["attributes"]["_engagement_time_msec"] = current_timestamp - global_engagement_start_time
        user_engagement_event = get_final_event(EventType.USER_ENGAGEMENT, current_timestamp, user_engagement_event)
        user_engagement_event["attributes"]["_screen_name"] = global_previous_screen_name
        user_engagement_event["attributes"]["_screen_id"] = global_previous_screen_id
        events.append(user_engagement_event)
    return events


def get_action_events(user, event, current_timestamp):
    events = []
    global global_engagement_start_time
    action_type = enums.action_type.get_random_item()
    actions = enums.event_group[action_type]
    for action_event_type in actions:
        action_event = clean_event(event)
        if action_event_type == EventType.NOTE_CREATE:
            action_event["attributes"]["note_id"] = user.note_id
            user.note_id += 1
        elif action_event_type == EventType.NOTE_SHARE \
                or action_event_type == EventType.NOTE_PRINT \
                or action_event_type == EventType.NOTE_EXPORT:
            action_event["attributes"]["note_id"] = random.randint(1, user.note_id)
        elif action_event_type == EventType.USER_ENGAGEMENT:
            if current_timestamp - global_engagement_start_time > 1000:
                action_event["attributes"]["_engagement_time_msec"] = current_timestamp - global_engagement_start_time
                action_event["attributes"]["_screen_name"] = global_previous_screen_name
                action_event["attributes"]["_screen_id"] = global_previous_screen_id
                global_engagement_start_time = current_timestamp
            else:
                continue
        elif action_event_type == EventType.USER_LOGIN:
            if not user.is_login_user:
                continue
            user_id = {
                "value": user.user_id,
                "set_timestamp": current_timestamp
            }
            user_name = {
                "value": user.name,
                "set_timestamp": current_timestamp
            }
            event["user"]["_user_id"] = user_id
            event["user"]["_user_name"] = user_name
            user.is_login = True
            user.login_timestamp = current_timestamp
        elif action_event_type.startswith("_screen_view"):
            screen_name = action_event_type.split(":")[1]
            screen = Screen.get_screen(screen_name)
            events.append(get_final_event(EventType.SCREEN_VIEW, current_timestamp, action_event, screen))
            current_timestamp += random.randint(100, 2000)
            continue
        events.append(get_final_event(action_event_type, current_timestamp, action_event))
        current_timestamp += random.randint(100, 2000)
    current_timestamp += random.choices(enums.PER_ACTION_DURATION)[0] * 1000
    return (events, current_timestamp)


def clean_event(event):
    new_event = event.copy()
    attributes = event["attributes"].copy()
    user = event["user"].copy()
    if "_screen_name" in attributes:
        del attributes["_screen_name"]
    if "_screen_id" in attributes:
        del attributes["_screen_id"]
    if "_previous_screen_name" in attributes:
        del attributes["_previous_screen_name"]
    if "_previous_screen_id" in attributes:
        del attributes["_previous_screen_id"]
    if "note_id" in attributes:
        del attributes["note_id"]
    if "_engagement_time_msec" in attributes:
        del attributes["_engagement_time_msec"]
    if "_entrances" in attributes:
        del attributes["_entrances"]
    new_event["attributes"] = attributes
    new_event["user"] = user
    return new_event
