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


class MobileDevice:
    def __init__(self, device_id, os_version, make, brand, model, locale, carrier, network_type,
                 screen_width, screen_height, zone_offset, system_language, country_code, ip_address):
        self.device_id = device_id
        self.os_version = os_version
        self.make = make
        self.brand = brand
        self.model = model
        self.locale = locale
        self.carrier = carrier
        self.network_type = network_type
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.zone_offset = zone_offset
        self.system_language = system_language
        self.country_code = country_code
        self.ip_address = ip_address

    @staticmethod
    def get_random_device(platform):
        if platform == enums.Platform.Android:
            brand = enums.android_brand.get_random_item()
            screen = enums.android_screens.get_random_item()
            os_version = enums.android_os_version.get_random_item()
            model = enums.get_model_for_brand(brand)
        else:
            brand = enums.ios_brand
            screen = enums.ios_screens.get_random_item()
            os_version = enums.ios_version.get_random_item()
            model = enums.ios_model.get_random_item()
        locale = enums.locale.get_random_item()
        split_local = locale[0].split('_')
        ip = util.generate_ip_by_country(split_local[1], locale[2])
        return MobileDevice(device_id=util.get_device_id(),
                            os_version=os_version,
                            make=brand,
                            brand=brand,
                            model=model,
                            locale=locale[0],
                            carrier=enums.carrier.get_random_item(),
                            network_type=enums.network_type.get_random_item(),
                            screen_width=screen[0],
                            screen_height=screen[1],
                            zone_offset=enums.zone_offset.get_random_item(),
                            system_language=split_local[0],
                            country_code=split_local[1],
                            ip_address=ip)
