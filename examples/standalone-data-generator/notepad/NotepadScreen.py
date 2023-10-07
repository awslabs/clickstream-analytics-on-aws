"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""


class Screen:
    NOTEPAD = ("NotepadActivity", "com.example.notepad.android.NotepadActivity")
    LOGIN = ('LoginActivity', "com.example.notepad.android.LoginActivity")
    NOTE_SHARE = ('NoteShareActivity', "com.example.notepad.android.NoteShareActivity")
    NOTE_PRINT = ('NotePrintActivity', "com.example.notepad.android.NotePrintActivity")
    NOTE_EXPORT = ('NoteExportActivity', "com.example.notepad.android.NoteExportActivity")

    @staticmethod
    def get_screen(screen_name):
        if screen_name == "note_share":
            return Screen.NOTE_SHARE
        elif screen_name == "note_print":
            return Screen.NOTE_PRINT
        elif screen_name == "note_export":
            return Screen.NOTE_EXPORT
        elif screen_name == "notepad":
            return Screen.NOTEPAD
        elif screen_name == "login":
            return Screen.LOGIN
