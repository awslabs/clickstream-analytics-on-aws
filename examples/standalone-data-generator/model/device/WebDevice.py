"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
import util.util as util
import enums as enums


class WebDevice:
    def __init__(self, device_id, ua, make, locale, screen_width, screen_height, viewport_width, viewport_height,
                 zone_offset, system_language, country_code, ip_address):
        self.device_id = device_id
        self.ua = ua
        self.make = make
        self.locale = locale
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.viewport_width = viewport_width
        self.viewport_height = viewport_height
        self.zone_offset = zone_offset
        self.system_language = system_language
        self.country_code = country_code
        self.ip_address = ip_address

    @staticmethod
    def get_random_device():
        screen = enums.web_screens.get_random_item()
        viewport = enums.web_viewport.get_random_item()
        locale = enums.locale.get_random_item()
        split_local = locale[0].split('_')
        ip = util.generate_ip_by_country(split_local[1], locale[2])
        return WebDevice(device_id=util.get_device_id(),
                         ua=enums.browser_ua.get_random_item(),
                         make=enums.browser_make.get_random_item(),
                         locale=locale[0],
                         screen_width=screen[1],
                         screen_height=screen[0],
                         viewport_width=viewport[1],
                         viewport_height=viewport[0],
                         zone_offset=enums.zone_offset.get_random_item(),
                         system_language=split_local[0],
                         country_code=split_local[1],
                         ip_address=ip)
