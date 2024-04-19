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
from application.AppProvider import AppProvider
import time
from concurrent.futures import ThreadPoolExecutor

global_current_time = utils.current_timestamp()
global_total_events_for_duration = 0
global_total_users_for_duration = 0
app_provider = AppProvider()
# left_users = []
# left_events = []


def init_all_user():
    user_list = []
    for _ in range(configure.ALL_USER_REALTIME_PERFORMANCE):
        user_list.append(app_provider.get_random_user())
    return user_list


def get_user_event_of_duration(users, start_timestamp):
    all_events = []
    end_timestamp = start_timestamp + configure.BATCH_EVENT_DURATION_IN_MINUTES_PERFORMANCE * 60 * 1000
    global global_total_events_for_duration, global_total_users_for_duration
    removed_users = []
    for user in users:
        events = []
        session_times = random.choices(configure.SESSION_TIMES)[0]
        start_time_arr = []
        for i in range(session_times):
            session_start_time = random.randint(start_timestamp, end_timestamp)
            if start_timestamp <= session_start_time <= end_timestamp:
                start_time_arr.append(session_start_time)
        start_time_arr = sorted(start_time_arr)

        for i in range(len(start_time_arr)):
            current_timestamp = start_time_arr[i]
            user.current_timestamp = current_timestamp
            app_provider.generate_session_events(user, events)
        if len(events) > 0:
            all_events.append(events)
            user.total_day_events = len(events)
            user.send_events = 0
            global_total_events_for_duration += len(events)
        else:
            removed_users.append(user)
    for user in removed_users:
        users.remove(user)
    global_total_users_for_duration += len(users)
    return all_events


def send_user_event_of_duration(users, all_events):
    for i in range(len(all_events)):
        for j in range(0, len(all_events[i]), 10):
            chunk = all_events[i][j:j + 10]
            if len(chunk) < 10:
                break
            send_event_real_time.send_events_of_day(users[i], chunk)


def create_duration_event(day_users):
    global global_total_users_for_duration, global_total_events_for_duration
    global_total_users_for_duration = 0
    global_total_events_for_duration = 0
    start_timestamp = utils.current_timestamp()
    end_timestamp = start_timestamp + configure.BATCH_EVENT_DURATION_IN_MINUTES_PERFORMANCE * 60 * 1000
    end_timestamp_min = utils.get_end_timestamp_minute(end_timestamp)
    print("\nstart send event until: " + end_timestamp_min + ", day user number: " + str(len(day_users)))

    executor = ThreadPoolExecutor(configure.THREAD_NUMBER_FOR_USER_PERFORMANCE + 1)
    n = int(len(day_users) / configure.THREAD_NUMBER_FOR_USER_PERFORMANCE) + 1
    user_arr = [day_users[i:i + n] for i in range(0, len(day_users), n)]

    handled_thread_count = 0
    for users in user_arr:
        all_events = get_user_event_of_duration(users, start_timestamp)
        handled_thread_count += 1
        print("started thread: " + str(handled_thread_count) + " with " + str(len(all_events)) + " users")
        if handled_thread_count == configure.THREAD_NUMBER_FOR_USER_PERFORMANCE:
            print("\nall events count in " + str(configure.BATCH_EVENT_DURATION_IN_MINUTES_PERFORMANCE) + " minutes: " + str(
                global_total_events_for_duration) + ", user count: " + str(global_total_users_for_duration) + "\n")
        executor.submit(send_user_event_of_duration, users, all_events)
    executor.shutdown(wait=True)

    print("end duration events sending\n\n")


if __name__ == '__main__':
    configure.init_config()
    if configure.APP_ID == "" or configure.ENDPOINT == "":
        print("Error: please config your appId and endpoint")
    else:
        users = init_all_user()
        day = ""
        day_users = []
        while True:
            if day != utils.get_current_day():
                users_count = random.choices(configure.RANDOM_DAU_PERFORMANCE)[0]
                day_users = random.sample(users, users_count)
                day = utils.get_current_day()
            create_duration_event(day_users)