
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

from clickstream_sample_data_tool.model.util import util as utils
import requests
from clickstream_sample_data_tool.model import enums as enums

global_sequence_id = 1


def send_events_to_server(user, events):
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    global global_sequence_id
    request_param = {
        "platform": "ANDROID",
        "appId": enums.APP_ID,
        "compression": "gzip",
        "fakeIp": user.device.ip_address,
        "event_bundle_sequence_id": global_sequence_id
    }
    global_sequence_id = global_sequence_id + 1
    response = requests.post(url=enums.ENDPOINT, params=request_param, headers=headers, data=events)
    if response.status_code == 200:
        print("send " + user.user_id + "'s events success, data len(" + str(len(events) / 1024) + "k)")
    else:
        print("send " + user.user_id + "'s events fail, status{}".format(response.status_code))


def send_events_of_day(user, events):
    event_line = utils.get_gzipped_line(events)
    start_time = utils.current_timestamp()
    send_events_to_server(user, event_line)
    user.send_events += len(events)
    print("send " + user.user_id + "'s " + str(len(events)) + " events, total events:" + str(
        user.total_day_events) + ", left events:" + str(user.total_day_events - user.send_events) + ", cost: " + str(
        utils.current_timestamp() - start_time) + "ms\n")
