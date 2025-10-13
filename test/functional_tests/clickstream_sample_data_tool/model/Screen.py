
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from enum import Enum


class Screen(Enum):
    NOTEPAD = ("NotepadActivity", "com.farmerbb.notepad.android.NotepadActivity")
    LOGIN = ('LoginActivity', "com.farmerbb.notepad.android.LoginActivity")
    NOTE_SHARE = ('NoteShareActivity', "com.farmerbb.notepad.android.NoteShareActivity")
    NOTE_PRINT = ('NotePrintActivity', "com.farmerbb.notepad.android.NotePrintActivity")
    NOTE_EXPORT = ('NoteExportActivity', "com.farmerbb.notepad.android.NoteExportActivity")

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
