"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
class EventType:
    SESSION_START = '_session_start'
    FIRST_OPEN = '_first_open'
    SCREEN_VIEW = '_screen_view'
    USER_ENGAGEMENT = '_user_engagement'
    ADD_BUTTON_CLICK = 'add_button_click'
    NOTE_CREATE = 'note_create'
    NOTE_SHARE = 'note_share'
    NOTE_PRINT = 'note_print'
    NOTE_EXPORT = 'note_export'
    USER_LOGIN = 'user_login'
