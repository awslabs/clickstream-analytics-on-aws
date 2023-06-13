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
import enums as enums
import util.util as utils
import model.Event as Event
from model.User import User
import send_event

global_current_time = utils.current_timestamp()


def init_all_user():
    user_list = []
    for i in range(enums.ALL_USER):
        user_list.append(User.get_random_user())
    return user_list


def get_user_event_of_day(user, day, events_of_day):
    events = []
    session_times = random.choices(enums.SESSION_TIMES)[0]
    event = Event.get_event_for_user(user)
    # different session for user in one day
    for i in range(session_times):
        hour = enums.visit_hour.get_random_item()
        minute = random.choices(enums.visit_minutes)[0]
        current_timestamp = day + (hour * 60 * 60 + minute * 60 + random.randint(0, 59)) * 1000 + random.randint(0, 999)
        events.extend(Event.get_launch_events(user, event, current_timestamp))
        current_timestamp += random.choices(enums.PER_ACTION_DURATION)[0] * 1000
        action_times = random.choices(enums.ACTION_TIMES)[0]
        # different action in one session
        for j in range(action_times):
            result = Event.get_action_events(user, event, current_timestamp)
            events.extend(result[0])
            current_timestamp = result[1]
        events.extend(Event.get_exit_events(event, current_timestamp))
    events_of_day.extend(events)


if __name__ == '__main__':
    enums.init_config()
    if enums.APP_ID == "" or enums.ENDPOINT == "":
        print("Error: please config your appId and endpoint")
    else:
        start_time = utils.current_timestamp()
        # init all user
        users = init_all_user()
        # get days arr
        days = utils.get_days_arr()
        total_event = 0
        for day in days:
            day_str = utils.get_day_of_timestamp(day)
            print("start day: " + day_str)
            events_of_day = []
            users_count = random.choices(enums.RANDOM_DAU)[0]
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
