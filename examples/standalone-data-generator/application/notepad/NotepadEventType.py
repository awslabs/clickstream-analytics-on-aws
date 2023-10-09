"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
from weighted.weighted import WeightedArray


class EventType:
    SESSION_START = '_session_start'
    FIRST_OPEN = '_first_open'
    APP_START = '_app_start'
    APP_END = '_app_end'
    SCREEN_VIEW = '_screen_view'
    USER_ENGAGEMENT = '_user_engagement'
    PROFILE_SET = '_profile_set'
    ADD_BUTTON_CLICK = 'add_button_click'
    NOTE_CREATE = 'note_create'
    NOTE_SHARE = 'note_share'
    NOTE_PRINT = 'note_print'
    NOTE_EXPORT = 'note_export'
    USER_LOGIN = 'user_login'


# event enum
action_type = WeightedArray(
    [('click_add', 1), ('note_create', 5), ('note_share', 5), ('note_export', 2), ('login', 1), ('note_print', 1),
     ('relaunch', 1)])
event_group = {
    'click_add': ['add_button_click'],
    'note_create': ['add_button_click', 'note_create'],
    'note_share': ['note_share', '_screen_view:note_share', '_screen_view:notepad'],
    'note_export': ['note_export', '_screen_view:note_export', '_screen_view:notepad'],
    'note_print': ['note_print', '_screen_view:note_print', '_screen_view:notepad'],
    'login': ['_screen_view:login', 'user_login', '_screen_view:notepad'],
    'relaunch': ['exit', '_screen_view:notepad'],
}
