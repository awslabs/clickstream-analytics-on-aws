# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from clickstream_sample_data_tool.model.Device import Device
from clickstream_sample_data_tool.model.App import App
from clickstream_sample_data_tool.util import util as util
from clickstream_sample_data_tool import enums as enums


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
