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
from weighted.weighted import WeightedArray
import json

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
ACTION_TIMES = range(0, 30)

# visit time weight
visit_hour = WeightedArray([(0, 10), (1, 5), (2, 1), (3, 1), (4, 2), (5, 5),
                            (6, 8), (7, 10), (8, 15), (9, 20), (10, 25), (11, 20),
                            (12, 19), (13, 30), (14, 35), (15, 40), (16, 45), (17, 50),
                            (18, 55), (19, 60), (20, 65), (21, 50), (22, 30), (23, 20)])
visit_minutes = range(0, 59)

# device enum
os_version = WeightedArray([('5', 1), ('6', 1), ('7', 2), ('8', 5), ('9', 7),
                            ('10', 14), ('11', 18), ('12', 32), ('13', 20)])
brand = WeightedArray(
    [('Samsung', 26.7), ('Xiaomi', 12.3), ('Oppo', 6.87), ('Vivo', 5.3), ('Huawei', 4.8), ('Realme', 4.0),
     ('Motorola', 2.2), ('Oneplus', 1.2), ('Honor', 0.8), ('Meizu', 0.6)])

locale = WeightedArray(
    [(('en_US', 'United States', ("100.0.0.0", "100.42.19.255")), 16.7),
     (('zh_CN', 'China', ("1.24.0.0", "1.31.255.255")), 22.3),
     (('fr_FR', 'France', ("104.108.32.0", "104.108.63.255")), 6.87),
     (('es_ES', 'Spain', ("109.167.0.0", "109.167.127.255")), 5.3),
     (('de_DE', 'Germany', ("104.101.236.0", "104.102.23.255")), 4.8),
     (('pt_BR', 'Brazil', ("104.41.0.0", "104.41.63.255")), 4.0),
     (('ja_JP', 'Japan', ("1.112.0.0", "1.115.255.255")), 2.2),
     (('ko_KR', 'South Korea', ("1.208.0.0", "1.255.255.255")), 1.2),
     (('ru_RU', 'Russia', ("109.123.128.0", "109.123.191.255")), 0.8),
     (('ar_SA', 'Saudi Arabia', ("139.64.0.0", "139.64.127.255")), 0.6)])

carrier = WeightedArray(
    [('China Mobile', 26.7), ('Verizon', 22.3), ('China Unicom', 10.87), ('AT&T', 15.3), ('China Unicom', 14.8),
     ('China Telecom', 4.0), ('T-Mobile', 2.2), ('US Cellular', 1.2), ('CBN', 0.8), ('Cricket Wireless', 0.6)])

network_type = WeightedArray([('Mobile', 46), ('WIFI', 53), ('UNKNOWN', 2)])
screens = WeightedArray(
    [((1080, 2160), 26.7), ((1080, 1920), 22.3), ((1440, 2560), 10.87), ((2160, 3840), 1.3), ((1080, 2340), 14.8),
     ((1080, 2316), 14.0), ((1080, 2400), 12.2), ((1440, 2960), 2.2), ((2160, 3840), 0.8), ((720, 1280), 5.6)])
zone_offset = WeightedArray(
    [(28800000, 26.7), (18000000, 16.7), (-14400000, 6.7), (-25200000, 2.7), (-21600000, 3.7), (-28800000, 7),
     (3600000, 10.7), (7200000, 3.7)])


def get_model_for_brand(brand):
    model = None
    if brand == 'Samsung':
        model = WeightedArray(
            [('Galaxy S23 Ultra', 16.7), ('Galaxy S23', 12.3), ('Galaxy Z Fold 4', 6.87),
             ('Galaxy Z Flip 4', 5.3), ('Galaxy S22+', 4.8), ('Galaxy S22', 4.0),
             ('Galaxy S21 Ultra', 2.2), ('Galaxy S20+', 1.2), ('Galaxy Note 10+', 0.8),
             ('Galaxy S10', 0.6)])
    elif brand == 'Xiaomi':
        model = WeightedArray(
            [('Redmi Note 12 Pro+ 5G', 16.7), ('Xiaomi 13 Pro', 12.3), ('Xiaomi 12 Pro', 6.87),
             ('Xiaomi 11T Pro', 5.3), ('Mi 11X Pro', 4.8), ('Mi 11 Ultra', 4.0),
             ('Mi 10', 2.2), ('Redmi K20 Pro', 1.2), ('RedmiNote 7 Pro', 0.8),
             ('Redmi Note 10', 0.6)])
    elif brand == 'Oppo':
        model = WeightedArray(
            [('Reno 8 Pro', 16.7), ('Reno 5 Pro 5G', 12.3), ('Oppo K3', 6.87),
             ('Reno 10x Zoom', 5.3), ('Reno 8', 4.8), ('Reno 7 5G', 4.0),
             ('Reno 6 Pro', 2.2), ('Reno 6', 1.2), ('Reno 4 Pro', 0.8),
             ('Oppo Reno 3 Pro', 0.6)])
    elif brand == 'Vivo':
        model = WeightedArray(
            [('Vivo X80 Pro', 16.7), ('Vivo X80', 12.3), ('Vivo X70 Pro+', 6.87),
             ('Vivo X60 Pro+', 5.3), ('Vivo X50 Pro', 4.8), ('Vivo V27 Pro', 4.0),
             ('Vivo V25 Pro', 2.2), ('Vivo T1', 1.2), ('Vivo V20 SE', 0.8),
             ('Vivo V20', 0.6)])
    elif brand == 'Huawei':
        model = WeightedArray(
            [('Huawei P60 Art', 16.7), ('Huawei P60 Pro', 12.3), ('Huawei P60', 6.87),
             ('Huawei Mate X3', 5.3), ('Nova 10 Youth Edition', 4.8), ('Huawei Pocket S', 4.0),
             ('Huawei Nova Y61', 2.2), ('Huawei Nova 10 SE', 1.2), ('Huawei Mate 50e', 0.8),
             ('Huawei Mate 50', 0.6)])
    elif brand == 'Realme':
        model = WeightedArray(
            [('Realme 10T 5G', 16.7), ('Realme C33 2023', 12.3), ('Realme C55', 6.87),
             ('Realme V23i', 5.3), ('Realme 10 Pro', 4.8), ('Realme 10 Pro+', 4.0),
             ('Realme 10 5G', 2.2), ('Realme 10 4G', 1.2), ('Realme C30s', 0.8),
             ('Realme C33', 0.6)])
    elif brand == 'Oneplus':
        model = WeightedArray(
            [('OnePlus Ace 2V', 16.7), ('OnePlus Ace 2', 12.3), ('OnePlus 11R', 6.87),
             ('OnePlus 11 5G', 5.3), ('OnePlus Nord N20 SE', 4.8), ('OnePlus Nord N300 5G', 4.0),
             ('OnePlus Ace Pro', 2.2), ('OnePlus Ace Pro', 1.2), ('OnePlus 9 Pro', 0.8),
             ('OnePlus 10 Pro', 0.6)])
    elif brand == 'Honor':
        model = WeightedArray(
            [('Honor Magic 5 Pro', 16.7), ('Honor Honor Magic Vs', 12.3), ('Honor Magic5 Ultimate', 6.87),
             ('Honor 70 Lite 5G', 5.3), ('Honor Magic 5', 4.8), ('Honor Magic 5 Lite', 4.0),
             ('Honor X9a', 2.2), ('Honor X40', 1.2), ('Honor 70 5G', 0.8),
             ('Honor X8 5G', 0.6)])
    elif brand == 'Motorola':
        model = WeightedArray(
            [('Motorola Edge 30 Pro', 16.7), ('Motorola Moto Z2 Force', 12.3), ('Motorola Moto X Force', 6.87),
             ('Moto E13', 5.3), ('Motorola Moto G72', 4.8), ('Moto G82 5G', 4.0),
             ('Motorola Edge 30', 2.2), ('Motorola Edge 20 Pro', 1.2), ('Motorola Moto G60', 0.8),
             ('Motorola Moto G9', 0.6)])
    elif brand == 'Meizu':
        model = WeightedArray(
            [('Meizu M16th', 16.7), ('Meizu m2', 12.3), ('Meizu M5', 6.87),
             ('Meizu 10', 5.3), ('Meizu 18X', 4.8), ('Meizu 18s Pro', 4.0),
             ('Meizu 18s', 2.2), ('Meizu 18 Pro', 1.2), ('Meizu 17', 0.8),
             ('Meizu 15', 0.6)])
    return model.get_random_item()


# app enum
app_version = WeightedArray([('2.2.0', 2), ('2.3.0', 1), ('2.4.0', 3), ('2.5.0', 5), ('2.5.1', 7),
                             ('2.6.0', 10), ('2.7.0', 12), ('2.8.1', 5), ('2.9.0', 20), ('3.0.0', 50)])
sdk_version = WeightedArray([('0.2.0', 15), ('0.2.1', 20), ('0.2.2', 3), ('0.2.3', 5), ('0.2.4', 7),
                             ('0.2.5', 10), ('0.2.6', 12), ('0.2.7', 5), ('0.2.8', 20), ('0.3.0', 50)])

# event enum
action_type = WeightedArray(
    [('click_add', 1), ('note_create', 5), ('note_share', 5), ('note_export', 2), ('login', 1), ('note_print', 1),
     ('relaunch', 1)])
event_group = {
    'click_add': ['add_button_click'],
    'note_create': ['add_button_click', 'note_create'],
    'note_share': ['note_share', '_screen_view:note_share', '_screen_view:notepad'],
    'note_export': ['note_export', '_screen_view:note_export', '_screen_view:notepad'],
    'note_print': ['note_print', '_screen_view:note_print', '_screen_view:notepad'],
    'login': ['_screen_view:login', 'user_login', '_screen_view:notepad'],
    'relaunch': ['_user_engagement', '_screen_view:notepad'],
}

# user enum
first_names = ['Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Charlotte', 'Mia', 'Amelia', 'Harper', 'Evelyn',
               'Abigail', 'Emily', 'Ella', 'Elizabeth', 'Camila', 'Luna', 'Sofia', 'Avery', 'Mila', 'Aria', 'Scarlett',
               'Penelope', 'Layla', 'Chloe', 'Victoria', 'Madison', 'Eleanor', 'Grace', 'Nora', 'Riley', 'Zoey',
               'Hannah', 'Hazel', 'Lily', 'Ellie', 'Violet', 'Lillian', 'Aurora', 'Natalie', 'Stella', 'Maya', 'Audrey',
               'Leah', 'Savannah', 'Bella', 'Alexa', 'Aaliyah', 'Lucy', 'Anna', 'Caroline', 'Nova', 'Genesis', 'Emilia',
               'Kennedy', 'Samantha', 'Maya', 'Genesis', 'Rebecca', 'Zoe', 'Makayla', 'Madelyn', 'Aubrey', 'Harmony',
               'Addison', 'Jasmine', 'Kinsley', 'Delilah', 'Sienna', 'Arianna', 'Katherine', 'Peyton', 'Melanie',
               'Autumn', 'Maria', 'Eva', 'Sadie', 'Ruby', 'Alyssa', 'Naomi', 'Nevaeh', 'Kylie', 'Gabriella', 'Molly',
               'Jocelyn', 'Gianna', 'Eliana', 'Aria', 'Madeline', 'Aubree', 'Brielle', 'Ariel', 'Faith', 'Cora',
               'Mckenzie', 'Adalynn', 'Raelynn', 'Elaina', 'Isabelle', 'Everly']
last_names = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
              'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez',
              'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright',
              'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner',
              'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers',
              'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard',
              'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price',
              'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long',
              'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Gonzalez', 'Bryant',
              'Alexander', 'Russell', 'Griffin', 'Diaz', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham', 'Sullivan',
              'Wallace']


def get_random_user_name():
    return random.choices(first_names)[0] + " " + random.choices(last_names)[0]


channel = WeightedArray(
    [('Google play', 50), ('Amazon Appstore', 5), ('F-Droid', 10), ('Galaxy Store', 15), ('QQ Store', 8),
     ('Huawei Store', 12), ('Xiaomi Store', 7), ('Oppo Store', 6), ('Vivo Store', 5), ('360 Store', 2)])

traffic_source = WeightedArray(
    [(('email', "Search"), 1), (('baidu', "Recommendations"), 2), (('google', "Paid search"), 3),
     (('douyin', "App Referral"), 5), (('bytedance', "Search"), 4), (('', ""), 90)])

is_login_user = WeightedArray([(True, 93), (False, 7)])

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
