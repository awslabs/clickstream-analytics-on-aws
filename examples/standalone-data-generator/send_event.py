"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
import time

import configure
import util.util as utils
import requests
from concurrent.futures import ThreadPoolExecutor

global_sequence_id = 1


def send_events_to_server(events):
    time.sleep(configure.REQUEST_SLEEP_TIME)
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    global global_sequence_id
    gzip = "gzip" if configure.IS_GZIP else ""
    request_param = {
        "platform": "Android",
        "appId": configure.APP_ID,
        "compression": gzip,
        "fakeIp": utils.get_random_ip(),
        "event_bundle_sequence_id": global_sequence_id
    }
    global_sequence_id = global_sequence_id + 1
    try:
        response = requests.post(url=configure.ENDPOINT, params=request_param, headers=headers, data=events)
        if response.status_code == 200:
            print('sent events success, data len(' + str(len(events) / 1024) + ")")
        else:
            print('sent events fail, status{}'.format(response.status_code))
    except Exception as e:
        print("endpoint error: " + str(e))


def send_events_of_batch(events_of_batch):
    start_time = utils.current_timestamp()
    # gzip
    if configure.IS_GZIP:
        print("start gzip")
    else:
        print("start parse events")
    n = int(len(events_of_batch) / configure.GZIP_TIMES_PER_DAY) + 1
    events_of_day_arr = [events_of_batch[i:i + n] for i in range(0, len(events_of_batch), n)]
    for event_arr in events_of_day_arr:
        executor = ThreadPoolExecutor(configure.MAX_UPLOAD_THREAD_NUMBER)
        day_event_lines = utils.convert_to_gzip_events_process_pool(event_arr)
        if configure.IS_GZIP:
            print("gzip events cost: " + str(utils.current_timestamp() - start_time) + "ms")
        else:
            print("parse events cost: " + str(utils.current_timestamp() - start_time) + "ms")
        print("start send: " + str(len(day_event_lines)) + " requests, with " + str(len(events_of_batch)) + " events")
        start_time = utils.current_timestamp()
        for line in day_event_lines:
            executor.submit(send_events_to_server, line)
        executor.shutdown(wait=True)
    print("sent batch events cost: " + str(utils.current_timestamp() - start_time) + "ms")
    print("total request number: " + str(global_sequence_id - 1) + "\n")
