"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
with the License. A copy of the License is located at

    http://www.apache.org/licenses/LICENSE-2.0

or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
and limitations under the License.
"""
import json

import enums

PLATFORM = enums.Platform.All

# for history event consts
ALL_USER = 10000
DURATION_OF_DAYS = 30
RANDOM_DAU = range(1000, 2000)
PER_ACTION_DURATION = range(3, 60)
events_per_request = 10000
# gzip process number, for mac m1 is 8, for c5.metal is 50 to meet best performance
process_number = 50
# control the speed for event send.
max_upload_thread_number = 1
request_sleep_time = 0.2
gzip_times_per_day = 1

# for real-time event consts
ALL_USER_REALTIME = 100000
RANDOM_DAU_REALTIME = range(10000, 20000)
THREAD_NUMBER_FOR_USER = 100
PER_ACTION_DURATION_REALTIME = range(0, 5)
FLUSH_DURATION = 10
IS_GZIP = True

# common settings
# session and action duration
SESSION_TIMES = range(1, 5)

# following value will be replaced by amplifyconfiguration.json file.
APP_ID = ""
ENDPOINT = ""


def init_config():
    global APP_ID, ENDPOINT, IS_GZIP, request_sleep_time, max_upload_thread_number, events_per_request
    try:
        with open('amplifyconfiguration.json') as file:
            data = json.load(file)
            APP_ID = data['analytics']['plugins']['awsClickstreamPlugin']['appId']
            ENDPOINT = data['analytics']['plugins']['awsClickstreamPlugin']['endpoint']
            IS_GZIP = data['analytics']['plugins']['awsClickstreamPlugin']['isCompressEvents']
            if not IS_GZIP:
                request_sleep_time = 0.1
                max_upload_thread_number = 1
                events_per_request = 500
    except FileNotFoundError:
        print("Error: amplifyconfiguration.json file not found.")
    except json.JSONDecodeError:
        print("Error: when decoding the JSON file.")
    except KeyError:
        print("Error: error key in the JSON file.")
