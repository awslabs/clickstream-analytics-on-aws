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
import send_event
import util.util as utils
import shopping.ShoppingEvent as Event
from model.User import User
from notepad import NotepadEvent
from shopping import ShoppingScreen


def get_users(count):
    user_list = []
    for i in range(count):
        user_list.append(User.get_random_user())
    return user_list


def get_user_event_of_day(user, day, events_of_day):
    events = []
    session_times = random.choices(configure.SESSION_TIMES)[0]
    event = Event.get_event_for_user(user)
    # different session for user in one day
    start_times = utils.get_session_start_time_arr(session_times, day)
    for i in range(session_times):
        # init current timestamp
        user.current_timestamp = start_times[i]
        if configure.APP_TYPE == enums.Application.NotePad:
            gen_events_for_notepad(user, events, event)
        elif configure.APP_TYPE == enums.Application.Shopping:
            gen_events_for_shopping(user, events, event)
    events_of_day.extend(events)


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


def gen_events_for_notepad(user, events, event):
    events.extend(NotepadEvent.get_launch_events(user, event))
    user.current_timestamp += random.choices(configure.PER_ACTION_DURATION)[0] * 1000
    action_times = random.choices(configure.ACTION_TIMES)[0]
    for j in range(action_times):
        events.extend(NotepadEvent.get_action_events(user, event))
    events.extend(NotepadEvent.get_exit_events(user, event))


if __name__ == '__main__':
    configure.init_config()
    if configure.APP_ID == "" or configure.ENDPOINT == "":
        print("Error: please config your appId and endpoint")
    else:
        start_time = utils.current_timestamp()
        # init all user
        all_user_count = configure.get_all_user_count()
        users = get_users(int(all_user_count / 2))
        new_users_of_day = int(all_user_count / 60)
        # get days arr
        days = utils.get_days_arr()
        total_event = 0
        for day in days:
            day_str = utils.get_day_of_timestamp(day)
            print("start day: " + day_str)
            events_of_day = []
            users_count = random.choices(configure.get_dau_count())[0]
            users.extend(get_users(new_users_of_day))
            day_users = random.sample(users, users_count)
            print("total user: " + str(users_count))
            start_gen_day_user_event_time = utils.current_timestamp()
            for user in day_users:
                get_user_event_of_day(user, day, events_of_day)
            total_event = total_event + len(events_of_day)
            print("gen " + str(len(events_of_day)) + " events for " + day_str + " cost:" + str(
                utils.current_timestamp() - start_gen_day_user_event_time) + "\n")
            # send event
            send_event.send_events_of_day(events_of_day)

        print("job finished, upload " + str(total_event) + " events, cost: " +
              str(utils.current_timestamp() - start_time) + "ms")
