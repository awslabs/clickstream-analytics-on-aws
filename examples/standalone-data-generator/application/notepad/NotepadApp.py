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
from model.App import App
from application.notepad import NotepadEventType
from application.notepad.NotepadEventType import EventType
from application.notepad.NotepadScreen import Screen
from model.User import User
from model.device.MobileDevice import MobileDevice

sampleEvent = {
    "event_type": "",
    "event_id": "",
    "app_id": "",
    "unique_id": "",
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
        "_session_number": 0,
        "_channel": "",
        "_traffic_source_source": "",
        "_traffic_source_medium": "",
        "_screen_name": "",
        "_screen_id": ""
    }
}


def get_event_for_user(user):
    event = sampleEvent
    event["unique_id"] = user.user_unique_id
    event["app_id"] = configure.APP_ID
    event["device_id"] = user.mobile_device.device_id
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


def get_final_event(user, event_type, event):
    event["event_type"] = event_type
    uuid = utils.get_unique_id()
    event["event_id"] = uuid
    event["timestamp"] = user.current_timestamp
    start_timestamp = event["attributes"]["_session_start_timestamp"]
    event["attributes"]["_session_duration"] = user.current_timestamp - start_timestamp
    event["attributes"]["_screen_name"] = user.current_page[0]
    event["attributes"]["_screen_id"] = user.current_page[1]
    user.current_timestamp += random.randint(1, 100)
    return event


def get_launch_events(user, event):
    user.current_page = ('', '')
    user.current_page_start_time = user.current_timestamp
    events = []
    # handle traffic_source
    traffic_source = enums.traffic_source.get_random_item()
    event["attributes"]["_traffic_source_source"] = traffic_source[0]
    event["attributes"]["_traffic_source_medium"] = traffic_source[1]
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
        event["user"]["_user_id"] = user_id

    # handle session
    user.session_number += 1
    new_session_id = get_new_session_id(event["unique_id"], user.current_timestamp)
    event["attributes"]["_session_start_timestamp"] = user.current_timestamp
    event["attributes"]["_session_id"] = new_session_id
    event["attributes"]["_session_number"] = user.session_number
    events.append(get_final_event(user, EventType.SESSION_START, clean_event(event)))
    events.append(get_final_event(user, EventType.APP_START, clean_event(event)))
    # add screen view event for first screen
    screen_view_event = clean_event(event)
    screen_view_event["attributes"]["_entrances"] = 1
    user.current_page = Screen.NOTEPAD
    user.current_page_start_time = user.current_timestamp
    events.append(get_final_event(user, EventType.SCREEN_VIEW, screen_view_event))
    user.current_timestamp += random.choices(configure.PER_ACTION_DURATION)[0] * 1000
    return events


# get the user in current screen events
def get_exit_events(user, event):
    events = []
    engagement_time = user.current_timestamp - user.current_page_start_time
    if engagement_time > 1000:
        user_engagement_event = clean_event(event)
        user_engagement_event["attributes"]["_engagement_time_msec"] = engagement_time
        user_engagement_event = get_final_event(user, EventType.USER_ENGAGEMENT, user_engagement_event)
        events.append(user_engagement_event)
    # app end
    events.append(get_final_event(user, EventType.APP_END, clean_event(event)))
    return events


def get_action_events(user, event):
    events = []
    action_type = NotepadEventType.action_type.get_random_item()
    actions = NotepadEventType.event_group[action_type]
    for action_event_type in actions:
        action_event = clean_event(event)
        if action_event_type == EventType.NOTE_CREATE:
            action_event["attributes"]["note_id"] = user.note_id
            user.note_id += 1
        elif action_event_type == EventType.NOTE_SHARE \
                or action_event_type == EventType.NOTE_PRINT \
                or action_event_type == EventType.NOTE_EXPORT:
            action_event["attributes"]["note_id"] = random.randint(1, user.note_id)
        elif action_event_type == EventType.USER_LOGIN:
            if not user.is_login_user:
                continue
            user_id = {
                "value": user.user_id,
                "set_timestamp": user.current_timestamp
            }
            user_name = {
                "value": user.name,
                "set_timestamp": user.current_timestamp
            }
            event["user"]["_user_id"] = user_id
            action_event["user"]["_user_id"] = user_id
            action_event["user"]["_user_name"] = user_name
            # profile set
            events.append(get_final_event(user, EventType.PROFILE_SET, event))
            user.is_login = True
            user.login_timestamp = user.current_timestamp
        elif action_event_type == 'exit':
            events.extend(get_exit_events(user, event))
            user.current_timestamp += random.randint(1000, 5000)
            action_event_type = EventType.APP_START
        elif action_event_type.startswith("_screen_view"):
            # user engagement
            engagement_time = user.current_timestamp - user.current_page_start_time
            if engagement_time > 1000:
                user_engagement_event = clean_event(event)
                user_engagement_event["attributes"]["_engagement_time_msec"] = engagement_time
                events.append(get_final_event(user, EventType.USER_ENGAGEMENT, user_engagement_event))
            screen_name = action_event_type.split(":")[1]
            screen = Screen.get_screen(screen_name)
            action_event["attributes"]['_previous_screen_name'] = user.current_page[0]
            action_event["attributes"]['_previous_screen_id'] = user.current_page[1]
            user.current_page = screen
            events.append(get_final_event(user, EventType.SCREEN_VIEW, action_event))
            user.current_timestamp += random.randint(100, 2000)
            continue
        events.append(get_final_event(user, action_event_type, action_event))
        user.current_timestamp += random.randint(100, 2000)
    user.current_timestamp += random.choices(configure.PER_ACTION_DURATION)[0] * 1000
    return events


def clean_event(event):
    new_event = event.copy()
    attributes = event["attributes"].copy()
    user = event["user"].copy()
    if "_previous_screen_name" in attributes:
        del attributes["_previous_screen_name"]
    if "_previous_screen_id" in attributes:
        del attributes["_previous_screen_id"]
    if "_engagement_time_msec" in attributes:
        del attributes["_engagement_time_msec"]
    if "_entrances" in attributes:
        del attributes["_entrances"]
    if "_is_first_time" in attributes:
        del attributes["_is_first_time"]
    new_event["attributes"] = attributes
    new_event["user"] = user
    return new_event


class NotePadApp(App):

    def get_all_user_count(self):
        return configure.ALL_USER

    def get_dau_count(self):
        return configure.RANDOM_DAU

    def get_random_user(self):
        platform = enums.Platform.Android
        mobile_device = MobileDevice.get_random_device(platform)
        return User.get_random_user(platform, mobile_device, None)

    def gen_session_events(self, user, events):
        event = get_event_for_user(user)
        events.extend(get_launch_events(user, event))
        user.current_timestamp += random.choices(configure.PER_ACTION_DURATION)[0] * 1000
        action_times = random.choices(configure.ACTION_TIMES)[0]
        for j in range(action_times):
            events.extend(get_action_events(user, event))
        events.extend(get_exit_events(user, event))
