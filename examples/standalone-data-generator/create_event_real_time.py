"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
import random

import configure
import enums as enums
import send_event_real_time
import util.util as utils
from model.User import User
import time
from concurrent.futures import ThreadPoolExecutor

from notepad import NotepadEvent
from shopping import ShoppingScreen
import shopping.ShoppingEvent as Event

global_current_time = utils.current_timestamp()
global_total_events_for_day = 0


def init_all_user():
    user_list = []
    for i in range(configure.ALL_USER_REALTIME):
        user_list.append(User.get_random_user())
    return user_list


def get_user_event_of_day(users, start_time_stamp):
    all_events = []
    end_timestamp = utils.get_tomorrow_timestamp()
    today = utils.get_today_timestamp()
    global global_total_events_for_day
    removed_users = []
    user_count = 0
    for user in users:
        user_count += 1
        events = []
        event = {}
        session_times = random.choices(configure.SESSION_TIMES)[0]
        if configure.APP_TYPE == enums.Application.NotePad:
            event = NotepadEvent.get_event_for_user(user)
        elif configure.APP_TYPE == enums.Application.Shopping:
            event = Event.get_event_for_user(user)
        start_time_arr = []
        for i in range(session_times):
            hour = enums.visit_hour.get_random_item()
            minute = random.choices(enums.visit_minutes)[0]
            session_start_time = today + (hour * 60 * 60 + minute * 60 + random.randint(0, 59)) * 1000 \
                                 + random.randint(0, 999)
            if session_start_time > start_time_stamp:
                start_time_arr.append(session_start_time)
        start_time_arr = sorted(start_time_arr)

        for i in range(len(start_time_arr)):
            current_timestamp = start_time_arr[i]
            user.current_timestamp = current_timestamp
            if configure.APP_TYPE == enums.Application.NotePad:
                gen_events_for_notepad(user, events, event)
            elif configure.APP_TYPE == enums.Application.Shopping:
                gen_events_for_shopping(user, events, event)
        if len(events) > 0:
            all_events.append(events)
            user.total_day_events = len(events)
            user.send_events = 0
            global_total_events_for_day += len(events)
        else:
            removed_users.append(user)
    for user in removed_users:
        users.remove(user)
    return all_events


def send_user_event_of_day(users, all_events):
    while utils.current_timestamp() < utils.get_tomorrow_timestamp():
        now_time = utils.current_timestamp()
        for i in range(len(all_events)):
            for j in range(len(all_events[i])):
                if all_events[i][0]["timestamp"] < now_time < all_events[i][j]["timestamp"]:
                    send_event_real_time.send_events_of_day(users[i], all_events[i][0:j])
                    all_events[i] = all_events[i][j:]
                    break
        time.sleep(configure.FLUSH_DURATION)


def gen_events_for_notepad(user, events, event):
    events.extend(NotepadEvent.get_launch_events(user, event))
    user.current_timestamp += random.choices(configure.PER_ACTION_DURATION_REALTIME)[0] * 1000
    action_times = random.choices(configure.ACTION_TIMES)[0]
    # different action in one session
    for j in range(action_times):
        events.extend(NotepadEvent.get_action_events(user, event))
    events.extend(NotepadEvent.get_exit_events(user, event))


def gen_events_for_shopping(user, events, event):
    events.extend(Event.get_launch_events(user, event))
    # different action in one session
    screen_view_times = enums.screen_view_times.get_random_item() + random.randint(0, 9)
    page = ShoppingScreen.Page.LOGIN
    for j in range(screen_view_times):
        result = Event.get_screen_events(user, event, page)
        events.extend(result[0])
        if page == ShoppingScreen.Page.EXIT:
            break
        page = result[1]
    if page != ShoppingScreen.Page.EXIT:
        page = ShoppingScreen.Page.EXIT
        result = Event.get_screen_events(user, event, page)
        events.extend(result[0])


def create_day_event(day_users):
    global global_total_events_for_day, global_total_add_count
    global_total_events_for_day = 0
    global_total_add_count = 0
    day = utils.get_current_day()
    print("start day: " + day + ", user number:" + str(len(day_users)))
    start_time_stamp = utils.current_timestamp()
    executor = ThreadPoolExecutor(configure.THREAD_NUMBER_FOR_USER)
    n = int(len(day_users) / configure.THREAD_NUMBER_FOR_USER) + 1
    user_arr = [day_users[i:i + n] for i in range(0, len(day_users), n)]

    handled_thread_count = 0
    for users in user_arr:
        all_events = get_user_event_of_day(users, start_time_stamp)
        handled_thread_count += 1
        print("finished thread count: " + str(handled_thread_count))
        if handled_thread_count == configure.THREAD_NUMBER_FOR_USER:
            print("all events count today: " + str(global_total_events_for_day))
        executor.submit(send_user_event_of_day, users, all_events)
    executor.shutdown(wait=True)
    print("end day:" + day)


if __name__ == '__main__':
    configure.init_config()
    if configure.APP_ID == "" or configure.ENDPOINT == "":
        print("Error: please config your appId and endpoint")
    else:
        users = init_all_user()
        while True:
            users_count = random.choices(configure.RANDOM_DAU_REALTIME)[0]
            day_users = random.sample(users, users_count)
            create_day_event(day_users)
