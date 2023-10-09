"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
import configure
from application.notepad.NotepadApp import NotePadApp
from application.shopping.ShoppingApp import ShoppingApp
import enums as enums


class AppProvider:
    def __init__(self):
        if configure.APP_TYPE == enums.Application.NotePad:
            self.app = NotePadApp()
        elif configure.APP_TYPE == enums.Application.Shopping:
            self.app = ShoppingApp()

    def generate_session_events(self, user, events):
        self.app.gen_session_events(user, events)

    def get_random_user(self):
        return self.app.get_random_user()

    def get_all_user_count(self):
        return self.app.get_all_user_count()

    def get_dau_count(self):
        return self.app.get_dau_count()
