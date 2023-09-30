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
from model.device.MobileDevice import MobileDevice
from model.device.WebDevice import WebDevice
from model.App import App
import util.util as util
import enums as enums


class User:
    def __init__(self, user_id, user_unique_id, mobile_device, device_web, name, app, channel,
                 is_login_user, platform, is_switch_to_web, gender, age):
        self.user_id = user_id
        self.user_unique_id = user_unique_id
        self.login_timestamp = 0
        self.name = name
        self.mobile_device = mobile_device
        self.device_web = device_web
        self.app = app
        self.is_login = False
        self.is_first_open = True
        self.channel = channel
        self.is_login_user = is_login_user
        self.first_touch_timestamp = 0
        self.total_day_events = 0
        self.send_events = 0
        self.platform = platform
        self.is_switch_to_web = is_switch_to_web
        self.session_number = 0
        self.latest_referrer = ''
        self.latest_referrer_host = ''
        self.current_timestamp = 0
        self.current_page_type = ''
        self.current_page = ('', '')
        self.current_page_start_time = 0
        self.prefer_category = ''
        self.gender = gender
        self.age = age

    @staticmethod
    def get_random_user():
        mobile_device = None
        device_web = None
        is_switch_to_web = False
        if configure.PLATFORM == enums.Platform.All:
            platform = enums.random_platform.get_random_item()
            if platform != enums.Platform.Web:
                is_switch_to_web = enums.is_switch_to_web.get_random_item()
                if is_switch_to_web:
                    device_web = WebDevice.get_random_device()
        else:
            platform = configure.PLATFORM

        if platform == enums.Platform.Web:
            device_web = WebDevice.get_random_device()
        else:
            mobile_device = MobileDevice.get_random_device(platform)
        age = enums.age_range.get_random_item() + random.randint(0, 10)
        return User(util.get_unique_id(), util.get_unique_id(), mobile_device, device_web,
                    enums.get_random_user_name(), App.get_random_app(), enums.channel.get_random_item(),
                    enums.is_login_user.get_random_item(), platform, is_switch_to_web,
                    enums.user_gender.get_random_item(), age)
