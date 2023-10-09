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
