# Clickstream Android SDK

## Introduction

Clickstream Android SDK can help you easily collect and report in-app events from Android devices to AWS. As part of the solution {{ solution_name }}, this SDK provisions data pipeline to ingest and process event data into AWS services such as Amazon S3, and Amazon Redshift.

The SDK is based on the Amplify for Android SDK Core Library and developed according to the Amplify Android SDK plug-in specification. In addition, the SDK is equipped with features that automatically collect common user events and attributes (for example, screen view, and first open) to simplify data collection for users.

### Platform Support

Clickstream Android SDK supports Android 4.1 (API level 16) and later. 

## Integrate the SDK

### 1. Include the SDK

Add the following dependency to your `app` module's `build.gradle` file.

```groovy
dependencies {
    implementation 'software.aws.solution:clickstream:0.4.1'
}
```

Next, synchronize your project with the latest version: [![Maven Central](https://img.shields.io/maven-central/v/software.aws.solution/clickstream.svg)](https://search.maven.org/artifact/software.aws.solution/clickstream) 

### 2. Configure parameters

Find the `res` directory under your `project/app/src/main`, and manually create a raw folder in the `res` directory. 

![android_raw_folder](../images/sdk-manual/android_raw_folder.png) 

Download your `amplifyconfiguration.json` file from your clickstream control plane, and paste it to the raw folder. The JSON file is like:

```json
{
  "analytics": {
    "plugins": {
      "awsClickstreamPlugin": {
        "appId": "appId",
        "endpoint": "https://example.com/collect",
        "isCompressEvents": true,
        "autoFlushEventsInterval": 10000,
        "isTrackAppExceptionEvents": false
      }
    }
  }
}
```

In the file, your `appId` and `endpoint` are already configured. The explanation for each property is as follows:

- **appId**: the app id of your project in control plane.
- **endpoint**: the endpoint url you will upload the event to AWS server.
- **isCompressEvents**: whether to compress event content when uploading events, and the default value is `true`
- **autoFlushEventsInterval**: event sending interval, and the default value is `10s`
- **isTrackAppExceptionEvents**: whether auto track exception event in app, and the default value is `true`

### 3. Initialize the SDK

Initialize the SDK in the application `onCreate()` method.

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

public void onCreate() {
    super.onCreate();

    try{
        ClickstreamAnalytics.init(this);
        Log.i("MyApp", "Initialized ClickstreamAnalytics");
    } catch (AmplifyException error){
        Log.e("MyApp", "Could not initialize ClickstreamAnalytics", error);
    } 
}
```

### 4. Configure the SDK

After initializing the SDK, you can use the following code to customize it.

!!! Important "Important"
    This configuration will override the default configuration in `amplifyconfiguration.json` file. 

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

// config the SDK after initialize.
ClickstreamAnalytics.getClickStreamConfiguration()
            .withAppId("appId")
            .withEndpoint("https://example.com/collect")
            .withAuthCookie("your authentication cookie")
            .withSendEventsInterval(10000)
            .withSessionTimeoutDuration(1800000)
            .withTrackAppExceptionEvents(false)
            .withLogEvents(true)
            .withCustomDns(CustomOkhttpDns.getInstance())
            .withCompressEvents(true);
```

### 5. Record event

Add the following code where you need to report an event. For more information, refer to [Github](https://github.com/awslabs/clickstream-android#start-using).

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;
import software.aws.solution.clickstream.ClickstreamEvent;

ClickstreamEvent event = ClickstreamEvent.builder()
    .name("PasswordReset")
    .add("Channel", "SMS")
    .add("Successful", true)
    .add("ProcessDuration", 78.2)
    .add("UserAge", 20)
    .build();
ClickstreamAnalytics.recordEvent(event);

// for record an event directly
ClickstreamAnalytics.recordEvent("button_click");
```

## Data format definition

### Data types

Clickstream Android SDK supports the following data types:

| Data type | Range                                    | Example        |
| --------- | ---------------------------------------- | ------------- |
| int       | -2147483648 ～ 2147483647                   | 12            |
| long      | -9223372036854775808 ～ 9223372036854775807 | 26854775808   |
| double    | 4.9E-324 ～ 1.7976931348623157E308          | 3.14          |
| boolean   | true </br>false                               | true          |
| String    | max 1024 characters              | "Clickstream" |

### Naming rules

1. The event name and attribute name cannot start with a number, and only contain uppercase and lowercase letters, numbers, and underscores. In case of an invalid event name, it will throw `IllegalArgumentException`. In case of an invalid attribute name or user attribute name, it will discard the attribute and record error.

2. Do not use `_` as prefix in an event name or attribute name, because the `_` prefix is reserved for the solution.

3. The event name and attribute name are case sensitive, so `Add_to_cart` and `add_to_cart` will be recognized as two different event names.

### Event and attribute limitation

In order to improve the efficiency of querying and analysis, we apply limits to event data as follows:

| Name                            | Recommended          | Maximum          | Handle strategy for exceed     |
| ------------------------------- | ------------------- | ------------------- | ------------------------------ |
| Length of event name            | less than 25 characters  | 50 characters        | throw IllegalArgumentException |
| Length of event attribute name  | less than 25 characters  | 50 characters        | discard, log and record error  |
| Length of event attribute value | less than 100 characters | 1024 characters      | discard, log and record error  |
| Event attribute per event       | less than 50 attributes  | 500 event attribute | discard, log and record error  |
| User attribute number           | less than 25 attributes  | 100 user attributes  | discard, log and record error  |
| Length of user attribute name   | less than 25 characters  | 50 characters        | discard, log and record error  |
| Length of user attribute value  | less than 50 characters  | 256 characters       | discard, log and record error  |

!!! Important "Important"

    - The character limits are the same for single-width character languages (e.g., English) and double-width character languages (e.g., Chinese).
    - The limit of event attribute per event include common attributes and preset attributes.
    - If the attribute or user attribute with the same name is added more than twice, the latest value will apply.

## Preset events and attributes

### Preset events

Automatically collected events:

| Event name       | Triggered                                             | Event Attributes                                                                                                  |
| ---------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| _session_start   | when users app come to foreground for the first time and there is no on-going session                         | _session_id <br>_session_start_timestamp<br>_session_duration                                                     |
| _screen_view     | when the activity callback `onResume()` method              | _screen_name<br>_screen_id<br>_previous_screen_name<br>_previous_screen_id<br>_entrances<br>_engagement_time_msec |
| _app_exception   | when the app crashes                                     | _exception_message<br>_exception_stack                                                                            |
| _app_update      | when the app is updated to a new version and launched again | _previous_app_version                                                                                             |
| _first_open      | when the user launches an app the first time after installation       |                                                                                                                   |
| _os_update       | when device operating system is updated to a new version         | _previous_os_version                                                                                              |
| _user_engagement | when the app is in the foreground for at least one second       | _engagement_time_msec<br>                                                                                         |
| _profile_set     | when the `addUserAttributes()` or `setUserId()` API is called |                                                                                                                   |

#### Session definition

In Clickstream Android SDK, we do not limit the total time of a session. As long as the time between the next entry of the app and the last exit time is within the allowable timeout period, the current session is considered to be continuous.

- **_session_start**: When the app starts for the first time, or the app was launched to the foreground and the time between the last exit exceeded `session_time_out` period.

- **_session_duration**: We calculate the `_session_duration` by minus the current event create timestamp and the session's `_session_start_timestamp`. This attribute will be added in every event during the session.

- **session_time_out**: By default, it is 30 minutes, which can be customized through the configuration API.

- **_session_number**: The total number of sessions by distinct session id, and `_session_number` will be appear in every event's attribute object.

#### User engagement definition

In Clickstream Android SDK, we define the `user_engagement` as the app which is in the foreground for at least one second.

- **when to send**: We send the event when the app navigate to background or navigate to another app.

- **engagement_time_msec**: We count the time from when the app comes in the foreground to when the app goes to the background.

### Common attributes and reserved attributes

#### Sample event structure

```json
{
    "hashCode": "80452b0",
    "unique_id": "c84ad28d-16a8-4af4-a331-f34cdc7a7a18",
    "event_type": "PasswordReset",
    "event_id": "460daa08-0717-4385-8f2e-acb5bd019ee7",
    "timestamp": 1667877566697,
    "device_id": "f24bec657ea8eff7",
    "platform": "ANDROID",
    "os_version": "10",
    "make": "HUAWEI",
    "brand":"HUAWEI",
    "model": "TAS-AN00",
    "locale": "zh_CN_#Hans",
    "carrier": "CDMA",
    "network_type": "Mobile",
    "screen_height": 2259,
    "screen_width": 1080,
    "zone_offset": 28800000,
    "system_language": "zh",
    "country_code": "CN",
    "sdk_version": "0.2.0",
    "sdk_name": "aws-solution-clickstream-sdk",
    "app_version": "1.0",
    "app_package_name": "com.notepad.app",
    "app_title": "Notepad",
    "app_id": "notepad-4a929eb9",
    "user": {
        "_user_id": {
            "value":"312121",
            "set_timestamp": 1667877566697
        },
        "_user_name": {
            "value":"carl",
            "set_timestamp": 1667877566697
        },
        "_user_first_touch_timestamp": {
            "value":1667877267895,
            "set_timestamp": 1667877566697
        }
    },
    "attributes": {
        "Channel": "SMS",
        "Successful": true,
        "Price": 120.1,
        "ProcessDuration": 791,
        "_session_id":"dc7a7a18-20221108-031926703",
        "_session_start_timestamp": 1667877566703,
        "_session_duration": 391809,
        "_session_number": 1
    }
}
```

All user attributes will be stored in `user` object, and all custom and global attributes in `attributes` object.

#### Reserved attributes

**User attributes**

| Attribute name              | Description                                |
| --------------------------- | --------------------------------------- |
| _user_id                    | Reserved for user id that is assigned by app                       |
| _user_ltv_revenue           | Reserved for user lifetime value   |
| _user_ltv_currency          | Reserved for user lifetime value currency        |
| _user_first_touch_timestamp | The time (in microseconds) when the user first opened the app or visited the site, and it is included in every event in `user` object |

**Reserved attributes**

| Attribute name                     | Description                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| _traffic_source_medium             | Reserved for traffic medium. Use this attribute to store the medium that acquired user when events were logged.                                                                                |
| _traffic_source_name               | Reserved for traffic name. Use this attribute to store the marketing campaign that acquired user when events were logged.  |
| _traffic_source_source             | Reserved for traffic source.  Name of the network source that acquired the user when the event were reported.  |
| _channel                           | The channel for app was downloaded                                                                             |
| _device_vendor_id                  |                                                                                                          |
| _device_advertising_id             |                                                                                                          |
| _entrances                         | Added in `_screen_view` event. The first `_screen_view` event in a session has the value 1, and others 0. |
| _session_id                        | Added in all events.                                                                                      |
| _session_start_timestamp           | Added in all events.                                                                                      |
| _session_duration                  | Added in all events.                                                                                      |
| _session_number                    | Added in all events. The initial value is 1, and the value is automatically incremented by user device.                                         |
