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
