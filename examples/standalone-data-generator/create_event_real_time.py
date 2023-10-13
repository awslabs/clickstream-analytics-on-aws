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
app_provider = AppProvider()


def init_all_user():
    user_list = []
    for i in range(configure.ALL_USER_REALTIME):
        user_list.append(app_provider.get_random_user())
    return user_list


def get_user_event_of_duration(users, start_timestamp):
    all_events = []
    today = utils.get_today_timestamp()
    end_timestamp = start_timestamp + configure.BATCH_EVENT_DURATION_OF_MINUTE * 60 * 1000
    global global_total_events_for_duration
    removed_users = []
    user_count = 0
    for user in users:
        user_count += 1
        events = []
        session_times = random.choices(configure.SESSION_TIMES)[0]
        start_time_arr = []
        for i in range(session_times):
            hour = enums.visit_hour.get_random_item()
            minute = random.choices(enums.visit_minutes)[0]
            session_start_time = today + (hour * 60 * 60 + minute * 60 + random.randint(0, 59)) * 1000 \
                                 + random.randint(0, 999)
            if start_timestamp < session_start_time < end_timestamp:
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
    return all_events


def send_user_event_of_duration(users, all_events, end_timestamp):
    while utils.current_timestamp() < end_timestamp:
        now_time = utils.current_timestamp()
        for i in range(len(all_events)):
            for j in range(len(all_events[i])):
                if all_events[i][0]["timestamp"] < now_time < all_events[i][j]["timestamp"]:
                    send_event_real_time.send_events_of_day(users[i], all_events[i][0:j])
                    all_events[i] = all_events[i][j:]
                    break
        time.sleep(configure.FLUSH_DURATION)


def create_duration_event(day_users):
    day = utils.get_current_day()
    print("start day: " + day + ", user number:" + str(len(day_users)))
    start_timestamp = utils.current_timestamp()
    end_timestamp = start_timestamp + configure.BATCH_EVENT_DURATION_OF_MINUTE * 60 * 1000
    executor = ThreadPoolExecutor(configure.THREAD_NUMBER_FOR_USER)
    n = int(len(day_users) / configure.THREAD_NUMBER_FOR_USER) + 1
    user_arr = [day_users[i:i + n] for i in range(0, len(day_users), n)]

    handled_thread_count = 0
    for users in user_arr:
        all_events = get_user_event_of_duration(users, start_timestamp)
        handled_thread_count += 1
        print("started thread count: " + str(handled_thread_count))
        if handled_thread_count == configure.THREAD_NUMBER_FOR_USER:
            print("all events count in " + str(configure.BATCH_EVENT_DURATION_OF_MINUTE) + " minutes: " + str(
                global_total_events_for_duration))
        executor.submit(send_user_event_of_duration, users, all_events, end_timestamp)
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
            create_duration_event(day_users)
