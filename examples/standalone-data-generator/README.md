## Clickstream sample data generator

This project can simulate Clickstream events for two types of applications, a notepad Android application and a
cross-platform (Android, iOS, Web) shopping application. In addition, we support the following two usage scenarios for
these two applications:

* send the last 30 days events.
* send events in real-time.

for the first scenarios app have total 10000 users and the DAU is 1000-2000 by default, all the activities will
generate different events with different attributes according to clickstream SDK rules, finally we will generate
latest 30 day's events to your server endpoint by day.

for the second scenarios we define the app have total 100000 users and the DAU is 10000-20000, all users events
will follow the `configure.py`'s rules and be generated at once. All events will send by timer which will calculate the
last 10s events and send the events by user.

### install dependency

> pip3 install requests

### requirement

hardware: 2 vCPU 4G memory 10G disk, eg: c6a.large
network: upstream bandwidth: 3MB/s
python version: 3.8+

### Add configuration file:

Please download your `amplifyconfiguration.json` file from your web console of the solution, then copy it to the root
folder which at the same level as README file. then you can execute the following command to create and send your sample
data.

In the `amplifyconfiguration.json` file, we will only parse `appId`, `endpoint` and `isCompressEvents` three parameter
to run the program.

### how to generate last 30 days events

> python3 create_event.py

### how to generate events in real-time

> python3 create_event_real_time.py

### Other configuration

Please modify the `configure.py` to define the data size and scenario.

```python

# Application Type, default is NotePad, you can switch to `enums.Application.Shopping` to send shopping events.
APP_TYPE = enums.Application.NotePad

# For History Events consts
# total day in recent for data
DURATION_OF_DAYS = 30
# per action's duration time
PER_ACTION_DURATION = range(3, 60)
# event count for per request
EVENTS_PER_REQUEST = 10000
# for mac m1 is 8, for c5.metal is 50 to meet the best performance
PROCESS_NUMBER = 8
# max thread for upload event
MAX_UPLOAD_THREAD_NUMBER = 1
# the sleep time for each request
REQUEST_SLEEP_TIME = 0.2
# the gzip times for per day, added for test huge events in one day and reduce memory usage
GZIP_TIMES_PER_DAY = 1

# For Real-Time Events Consts
# all user for real-time
ALL_USER_REALTIME = 100000
# dau for real-time sending.
RANDOM_DAU_REALTIME = range(10000, 20000)
# define the total thread for a day to handle the user's event generate and sending
THREAD_NUMBER_FOR_USER = 10
# flush events duration by second
FLUSH_DURATION = 10

# Common Settings
# session times for one user in a day
SESSION_TIMES = range(1, 5)
# whether to use gzip compression events when sending requests
IS_GZIP = True

# For NotePad App
ALL_USER = 10000
RANDOM_DAU = range(1000, 2000)
# action times for user in a session 
ACTION_TIMES = range(0, 30)
# duration second for every action, only for real-time mode
PER_ACTION_DURATION_REALTIME = range(0, 5)

# For Shopping App
ALL_USER_SHOPPING = 30000
RANDOM_DAU_SHOPPING = range(3000, 6000)
PLATFORM = enums.Platform.All


```

Please modify the `enums.py` to define the detail logic for device and user information. 