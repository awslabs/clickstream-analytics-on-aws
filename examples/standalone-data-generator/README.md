## Clickstream sample data generator

This project simulate the example notepad android app user's activities, we support two usage scenarios:
* send the last 30 days events.
* send events in real-time.

for the first scenarios notepad app have total 10000 users and the DAU is 1000-2000 by default, all the activities will generate different events with different attributes according to clickstream Android SDK rules, finally we will generate latest 30 day's events to your server endpoint by day.

for the second scenarios we define the notepad app have total 10000 users and the DAU is 10000-20000, all users events will follow the `enums.py`'s rules and be generated at once. All events will send by timer which will calculate the last 10s events and send the events by user.

### install dependency

> pip3 install requests

### requirement
hardware: 2 vCPU 4G memory 10G disk, eg: c6a.large
network: upstream bandwidth: 3MB/s
python version: 3.8+

### Add configuration file:
Please download your `amplifyconfiguration.json` file from your web console of the solution, then copy it to the root folder which at the same level as README file. then you can execute the following command to create and send your sample data.

In the `amplifyconfiguration.json` file, we will only parse `appId`, `endpoint` and `isCompressEvents` three parameter to run the program.

### how to generate last 30 days events

> python3 create_event.py


### how to generate events in real-time

> python3 create_event_real_time.py

### Other configuration

please modify the `enums.py` to define the data size and situation

```python

# for history event consts
# total user to choices
ALL_USER = 10000
# total day in recent for data
DURATION_OF_DAYS = 30
# the mau number for app
RANDOM_MAU = range(1000, 2000)
# session times for one user in a day
SESSION_TIMES = range(1, 5)
# action times for user in a session
ACTION_TIMES = range(0, 30)
# per action's duration time
PER_ACTION_DURATION = range(3, 30)
# event count for per request: 10000 events after gzip is about 550k size.
events_per_request = 10000
# for mac m1 is 8, for c5.metal is 50 to meet best performance
process_number = 8
# max thread for upload event
max_upload_thread_number = 256
# the gzip times for per day, added for test huge events in one day and reduce memory usage.
gzip_times_per_day = 1


# for real-time event consts
# all user for real-time.
ALL_USER_REALTIME = 100000
# dau for real-time sending.
RANDOM_DAU_REALTIME = range(10000, 20000)
# define the total thread for a day to handle the user's event generate and sending.
THREAD_NUMBER_FOR_USER = 100
# duration second for every action.
PER_ACTION_DURATION_REALTIME = range(0, 5)
# flush events duration by second.
FLUSH_DURATION = 10
```