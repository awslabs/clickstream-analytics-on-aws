# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from clickstream_sample_data_tool.util import util as utils
import requests
from clickstream_sample_data_tool import enums as enums
from concurrent.futures import ThreadPoolExecutor

global_sequence_id = 1


def send_events_to_server(events):
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    global global_sequence_id
    request_param = {
        "platform": "ANDROID",
        "appId": enums.APP_ID,
        "compression": "gzip",
        "fakeIp": utils.get_random_ip(),
        "event_bundle_sequence_id": global_sequence_id
    }
    global_sequence_id = global_sequence_id + 1
    response = requests.post(url=enums.ENDPOINT, params=request_param, headers=headers, data=events)
    if response.status_code == 200:
        print('send events success!!!! data len(' + str(len(events) / 1024) + ")")
    else:
        print('send events fail!!!! status{}'.format(response.status_code))


def send_events_of_day(events_of_day):
    start_time = utils.current_timestamp()
    executor = ThreadPoolExecutor(enums.max_upload_thread_number)
    # gzip
    print("start gzip")
    day_event_lines = utils.convert_to_gzip_events_process_pool(events_of_day)
    print("gzip events cost: " + str(utils.current_timestamp() - start_time) + "ms\n")
    print("start send: " + str(len(day_event_lines)) + " requests")
    start_time = utils.current_timestamp()
    for line in day_event_lines:
        executor.submit(send_events_to_server, line)
    executor.shutdown(wait=True)
    print("send day events cost: " + str(utils.current_timestamp() - start_time) + "ms")
    print("total request number: " + str(global_sequence_id - 1) + "\n\n")
