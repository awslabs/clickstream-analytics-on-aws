
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import random
from clickstream_sample_data_tool import enums as enums
from clickstream_sample_data_tool import send_event_real_time
from clickstream_sample_data_tool.util import util as utils
from clickstream_sample_data_tool.model import Event as Event
from clickstream_sample_data_tool.model.User import User
import time
import datetime
from concurrent.futures import ThreadPoolExecutor

global_current_time = utils.current_timestamp()
global_total_events_for_day = 0
global_total_add_count = 0


def init_all_user():
    user_list = []
    for i in range(enums.ALL_USER_REALTIME):
        user_list.append(User.get_random_user())
    return user_list


def send_user_event_of_day(users, start_time_stamp):
    all_events = []
    end_timestamp = utils.get_tomorrow_timestamp()
    today = utils.get_today_timestamp()
    global global_total_events_for_day, global_total_add_count
    removed_users = []
    for user in users:
        events = []
        session_times = random.choices(enums.SESSION_TIMES)[0]
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
            events.extend(Event.get_launch_events(user, event, current_timestamp))
            current_timestamp += random.choices(enums.PER_ACTION_DURATION_REALTIME)[0] * 1000
            action_times = random.choices(enums.ACTION_TIMES)[0]
            # different action in one session
            for j in range(action_times):
                result = Event.get_action_events(user, event, current_timestamp)
                events.extend(result[0])
                current_timestamp = result[1]
            events.extend(Event.get_exit_events(event, current_timestamp))
        if len(events) > 0:
            all_events.append(events)
            user.total_day_events = len(events)
            user.send_events = 0
            global_total_events_for_day += len(events)
        else:
            removed_users.append(user)
    for user in removed_users:
        users.remove(user)
    global_total_add_count += 1
    if global_total_add_count == 100:
        print("today event count:" + str(global_total_events_for_day) + "\n\n")
    # send events
    while utils.current_timestamp() < end_timestamp:
        now_time = utils.current_timestamp()
        for i in range(len(all_events)):
            for j in range(len(all_events[i])):
                if all_events[i][0]["timestamp"] < now_time < all_events[i][j]["timestamp"]:
                    send_event_real_time.send_events_of_day(users[i], all_events[i][0:j])
                    all_events[i] = all_events[i][j:]
                    break
        time.sleep(enums.FLUSH_DURATION)


def create_day_event(day_users):
    global global_total_events_for_day, global_total_add_count
    global_total_events_for_day = 0
    global_total_add_count = 0
    day = utils.get_current_day()
    print("start day: " + day + ", user number:" + str(len(day_users)))
    start_time_stamp = utils.current_timestamp()
    executor = ThreadPoolExecutor(enums.THREAD_NUMBER_FOR_USER)
    n = int(len(day_users) / enums.THREAD_NUMBER_FOR_USER) + 1
    user_arr = [day_users[i:i + n] for i in range(0, len(day_users), n)]
    for users in user_arr:
        executor.submit(send_user_event_of_day, users, start_time_stamp)
    executor.shutdown(wait=True)
    print("end day:" + day)


if __name__ == '__main__':
    if enums.APP_ID == "" or enums.ENDPOINT == "":
        print("Error: please config your appId and endpoint")
    else:
        users = init_all_user()
        while True:
            users_count = random.choices(enums.RANDOM_DAU_REALTIME)[0]
            day_users = random.sample(users, users_count)
            create_day_event(day_users)
            tomorrow = datetime.datetime.now() + datetime.timedelta(days=1)
            tomorrow = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
            delta = tomorrow - datetime.datetime.now()
            time.sleep(delta.seconds)
