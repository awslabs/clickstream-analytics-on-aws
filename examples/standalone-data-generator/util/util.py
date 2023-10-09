"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
import uuid
import random
import datetime
import json
import time
import configure
import enums as enums
import gzip
import base64
import multiprocessing


def get_device_id():
    return str(uuid.uuid4().hex)[:16]


def get_unique_id():
    return str(uuid.uuid4())


def get_session_id_of_timestamp(timestamp):
    date_obj = datetime.datetime.fromtimestamp(timestamp / 1000)
    return date_obj.strftime("%Y%m%d-%H%M%S%f")[:-3]


def get_session_start_time_arr(session_times, day):
    times = []
    for i in range(session_times):
        hour = enums.visit_hour.get_random_item()
        minute = random.choices(enums.visit_minutes)[0]
        start_timestamp = day + (hour * 60 * 60 + minute * 60 + random.randint(0, 59)) * 1000 + random.randint(0, 999)
        times.append(start_timestamp)
    times.sort()
    return times


def get_day_of_timestamp(timestamp):
    date_obj = datetime.datetime.fromtimestamp(timestamp / 1000)
    return date_obj.strftime("%Y%m%d")


def get_current_day():
    now = datetime.datetime.now()
    return now.strftime("%Y%m%d")


def current_timestamp():
    return round(time.time() * 1000)


def get_days_arr():
    now = datetime.datetime.now() - datetime.timedelta(days=1)
    timestamps = []
    for i in range(configure.DURATION_OF_DAYS):
        date = now - datetime.timedelta(days=i)
        date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        timestamp = int(date.timestamp()) * 1000
        timestamps.append(timestamp)
    timestamps.reverse()
    return timestamps


def get_tomorrow_timestamp():
    date = datetime.datetime.now() + datetime.timedelta(days=1)
    date = date.replace(hour=0, minute=0, second=0, microsecond=0)
    timestamp = int(date.timestamp()) * 1000
    return timestamp


def get_today_timestamp():
    date = datetime.datetime.now()
    date = date.replace(hour=0, minute=0, second=0, microsecond=0)
    timestamp = int(date.timestamp()) * 1000
    return timestamp


def generate_ip_by_country(country_code, iprange):
    return generate_random_ip(iprange[0], iprange[1])


def get_random_ip():
    iprange = enums.locale.get_random_item()[2]
    return generate_ip_by_country("", iprange)


def generate_random_ip(start_ip, end_ip):
    start = int(''.join([f"{i:08b}" for i in map(int, start_ip.split('.'))]), 2)
    end = int(''.join([f"{i:08b}" for i in map(int, end_ip.split('.'))]), 2)

    random_int = random.randint(start, end)

    ip_address = '.'.join([str((random_int >> 24) & 0xff),
                           str((random_int >> 16) & 0xff),
                           str((random_int >> 8) & 0xff),
                           str(random_int & 0xff)])
    return ip_address


def to_json(obj):
    if isinstance(obj, (bool, int, float)):
        return obj
    elif isinstance(obj, str):
        return obj
    elif isinstance(obj, dict):
        return {k: to_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [to_json(elem) for elem in obj]
    elif isinstance(obj, set):
        return [to_json(elem) for elem in list(obj)]
    else:
        raise TypeError("Object of type {} is not JSON serializable".format(type(obj).__name__))


def get_gzip(event_str):
    compressed_data = gzip.compress(event_str.encode('utf-8'))
    return base64.b64encode(compressed_data).decode('utf-8')


def convert_to_gzip_events_process_pool(events_of_day):
    n = configure.EVENTS_PER_REQUEST
    small_arr = [events_of_day[i:i + n] for i in range(0, len(events_of_day), n)]
    manager = multiprocessing.Manager()
    day_event_lines = manager.list()
    pool = multiprocessing.Pool(processes=configure.PROCESS_NUMBER)
    day_event_lines = pool.starmap(get_gzipped_line, [(configure.IS_GZIP, small_arr[i]) for i in range(len(small_arr))])
    pool.close()
    pool.join()
    return day_event_lines


def get_gzipped_line(is_gzip, arr):
    events_str = json.dumps(arr, default=to_json)
    if is_gzip:
        return get_gzip(events_str)
    else:
        return events_str
