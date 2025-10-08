
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from clickstream_sample_data_tool import enums as enums


class App:
    def __init__(self, app_version, sdk_version):
        self.app_version = app_version
        self.sdk_version = sdk_version

    @staticmethod
    def get_random_app():
        return App(app_version=enums.app_version.get_random_item(), sdk_version=enums.sdk_version.get_random_item())
