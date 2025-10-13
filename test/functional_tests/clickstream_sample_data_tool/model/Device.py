# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from clickstream_sample_data_tool.util import util as util
from clickstream_sample_data_tool import enums as enums


class Device:
    def __init__(self, device_id, os_version, make, brand, model, locale, carrier, network_type,
                 screen_width, screen_height, zone_offset, system_language, country, country_code,ip_address):
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
        self.country = country
        self.country_code = country_code
        self.ip_address = ip_address

    @staticmethod
    def get_random_device():
        brand = enums.brand.get_random_item()
        screen = enums.screens.get_random_item()
        locale = enums.locale.get_random_item()
        split_local = locale[0].split('_')
        ip = util.generate_ip_by_country(split_local[1], locale[2])
        return Device(device_id=util.get_device_id(),
                      os_version=enums.os_version.get_random_item(),
                      make=brand,
                      brand=brand,
                      model=enums.get_model_for_brand(brand),
                      locale=locale[0],
                      carrier=enums.carrier.get_random_item(),
                      network_type=enums.network_type.get_random_item(),
                      screen_width=screen[0],
                      screen_height=screen[1],
                      zone_offset=enums.zone_offset.get_random_item(),
                      system_language=split_local[0],
                      country=locale[1],
                      country_code=split_local[1],
                      ip_address=ip)
