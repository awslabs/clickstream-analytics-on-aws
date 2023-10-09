"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
from abc import abstractmethod, ABC


class App(ABC):

    @abstractmethod
    def get_all_user_count(self):
        pass

    @abstractmethod
    def get_dau_count(self):
        pass

    @abstractmethod
    def get_random_user(self):
        pass

    @abstractmethod
    def gen_session_events(self, user, events):
        pass
