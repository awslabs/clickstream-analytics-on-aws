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


class AppInfo:
    def __init__(self, app_version, sdk_version):
        self.app_version = app_version
        self.sdk_version = sdk_version

    @staticmethod
    def get_random_app():
        return AppInfo(app_version=enums.app_version.get_random_item(), sdk_version=enums.sdk_version.get_random_item())
