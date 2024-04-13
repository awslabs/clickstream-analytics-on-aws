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

# Application Type, default is Shopping, you can switch to `enums.Application.NotePad` to send NotePad events.
APP_TYPE = enums.Application.Shopping

# For History Events consts
# total day in recent for data
DURATION_OF_DAYS = 30
# per action's duration time
PER_ACTION_DURATION = range(3, 60)
# event count for per request
EVENTS_PER_REQUEST = 10000
# max request number in one batch events. Reduce this value to reduce memory usage. 
MAX_BATCH_REQUEST_NUMBER = 20
# for mac m1 is 8, for c5.metal is 50 to meet the best performance
PROCESS_NUMBER = 50
# max thread for upload event
MAX_UPLOAD_THREAD_NUMBER = 10
# the sleep time for each request
REQUEST_SLEEP_TIME = 0.1
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
# the duration(in minutes) of generation batch events for in one times, use this parameter to reduce memory usage
# no less than 10 minutes
BATCH_EVENT_DURATION_IN_MINUTES = 20
# whether print each request log in terminal, when switched to false, print every 100 requests.
IS_LOG_FULL_REQUEST_MESSAGE = True

# Common Settings
# session times for one user in a day
SESSION_TIMES = range(1, 4)
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
ALL_USER_SHOPPING = 5000
RANDOM_DAU_SHOPPING = range(300, 400)
PLATFORM = enums.Platform.All
# the number of products on one page of the shopping application, the minimum value is 2
MAIN_PAGE_PRODUCT_COUNT = 4
DEFAULT_PRODUCT_COUNT = 2


```

Please modify the `enums.py` to define the detail logic for device and user information. 

## Clickstream sample data for performance test
We have developed a tool for performance tests, which utilizes ECS Fargate to continuously send test data to Clickstream. The number of ECS Service tasks can be increased or decreased to adjust the RPS (Requests per Second).

Follow below step to start your Clickstream performance test
1. Add configuration file:

Please download your `amplifyconfiguration.json` file from your web console of the solution, then copy it to the root
folder which at the same level as README file. then you can execute the following command to create and send your sample
data.

In the `amplifyconfiguration.json` file, we will only parse `appId`, `endpoint` and `isCompressEvents` three parameter
to run the program.

2. Start performance test:
Run below script to start performance test
```
./create-ecs-performance-test.sh <testName> <taskNumber> <region>
```

<testName>: the suffix of the ECS cluster name, for example: if <testName> is **MyTest**, you ECS cluster name is **clickstream-sample-data-cluster-MyTest**
<taskNumber>: the number of your ECS service tasks, you can change it from the ECS console after the cluster created.
<region>: the region where the ECS cluster created.
For example: 
```
./create-ecs-performance-test.sh MyTest 5 us-east-1
```

According to our testing, if the ECS cluster of performance tool is created in the same region of the Clickstream solution, a task can generate about 200 RPS.
A request payload size is ~2KB and contains 10 events.

3. Clean up performance test resources.
run below script to clean up all resources of performance test tool
```
./cleanup-ecs-performance-test.sh <testName> <region>
```




