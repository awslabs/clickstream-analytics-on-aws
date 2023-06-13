"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
from model.Device import Device
from model.App import App
import util.util as util
import enums as enums


class User:
    def __init__(self, user_id, user_unique_id, device, name, app, channel, is_login_user):
        self.user_id = user_id
        self.user_unique_id = user_unique_id
        self.login_timestamp = 0
        self.name = name
        self.device = device
        self.app = app
        self.note_id = 1
        self.is_login = False
        self.is_first_open = True
        self.channel = channel
        self.is_login_user = is_login_user
        self.first_touch_timestamp = 0
        self.total_day_events = 0
        self.send_events = 0

    @staticmethod
    def get_random_user():
        return User(util.get_unique_id(), util.get_unique_id(), Device.get_random_device(),
                    enums.get_random_user_name(), App.get_random_app(), enums.channel.get_random_item(),
                    enums.is_login_user.get_random_item())
