# Clickstream Android SDK

## Introduction

Clickstream Android SDK can help you easily collect in-app click stream data from Android devices to your AWS environments through the data pipeline provisioned by this solution.

The SDK is based on the Amplify for Android SDK Core Library and developed according to the Amplify Android SDK plug-in specification. In addition, the SDK provides features that automatically collect common user events and attributes (for example, screen view and first open) to accelerate data collection for users.

### Platform Support

Clickstream Android SDK supports Android 4.1 (API level 16) and later. 

## Integrate the SDK

### 1. Include the SDK

Add the Clickstream SDK dependency to your `app` module's `build.gradle` file, for example:

```groovy
dependencies {
    implementation 'software.aws.solution:clickstream:0.10.1'
}
```

You can synchronize your project with the latest version: [![Maven Central](https://img.shields.io/maven-central/v/software.aws.solution/clickstream.svg)](https://central.sonatype.com/artifact/software.aws.solution/clickstream/versions) 

### 2. Configure parameters

Find the `res` directory under your `project/app/src/main`, and manually create a raw folder in the `res` directory. 

![android_raw_folder](../images/sdk-manual/android_raw_folder.png) 

Download your `amplifyconfiguration.json` file from your clickstream web console, and paste it to the raw folder. The JSON file is like:

```json
{
  "analytics": {
    "plugins": {
      "awsClickstreamPlugin": {
        "appId": "your appId",
        "endpoint": "https://example.com/collect",
        "isCompressEvents": true,
        "autoFlushEventsInterval": 10000,
        "isTrackAppExceptionEvents": false
      }
    }
  }
}
```

In the file, your `appId` and `endpoint` are already set up in it. The explanation for each property is as follows:

- **appId (Required)**: the app id of your project in web console.
- **endpoint (Required)**: the endpoint url you will upload the event to AWS server.
- **isCompressEvents**: whether to compress event content when uploading events, and the default value is `true`
- **autoFlushEventsInterval**: event sending interval, and the default value is `10s`
- **isTrackAppExceptionEvents**: whether auto track exception event in app, and the default value is `false`

### 3. Initialize the SDK

Initialize the SDK in the application `onCreate()` method.

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

public void onCreate() {
    super.onCreate();

    try{
        ClickstreamAnalytics.init(getApplicationContext());
        Log.i("MyApp", "Initialized ClickstreamAnalytics");
    } catch (AmplifyException error){
        Log.e("MyApp", "Could not initialize ClickstreamAnalytics", error);
    } 
}
```

### 4. Start using

#### Record event

Add the following code where you need to record event.

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;
import software.aws.solution.clickstream.ClickstreamEvent;

// for record an event with custom attributes
ClickstreamEvent event = ClickstreamEvent.builder()
    .name("button_click")
    .add("category", "shoes")
    .add("currency", "CNY")
    .add("value", 279.9)
    .build();
ClickstreamAnalytics.recordEvent(event);

// for record an event directly
ClickstreamAnalytics.recordEvent("button_click");
```

#### Add global attribute

```java
import software.aws.solution.clickstream.ClickstreamAttribute;
import software.aws.solution.clickstream.ClickstreamAnalytics;

ClickstreamAttribute globalAttribute = ClickstreamAttribute.builder()
    .add("channel", "Play Store")
    .add("level", 5.1)
    .add("class", 6)
    .add("isOpenNotification", true)
    .build();
ClickstreamAnalytics.addGlobalAttributes(globalAttribute);

// for delete an global attribute
ClickstreamAnalytics.deleteGlobalAttributes("level");
```

Please add the global attribute after the SDK initialization is completed, the global attribute will be added to the attribute object in all events.

#### Login and logout

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

// when user login success
ClickstreamAnalytics.setUserId("UserId");

// when user logout
ClickstreamAnalytics.setUserId(null);
```

#### Add user attribute

```java
import software.aws.solution.clickstream.ClickstreamAnalytcs;
import software.aws.solution.clickstream.ClickstreamUserAttribute;

ClickstreamUserAttribute clickstreamUserAttribute = ClickstreamUserAttribute.builder()
    .add("_user_age", 21)
    .add("_user_name", "carl")
    .build();
ClickstreamAnalytics.addUserAttributes(clickstreamUserAttribute);
```

Current login user's attributes will be cached in disk, so the next time app launch you don't need to set all user's attribute again, of course you can use the same api `ClickstreamAnalytics.addUserAttributes()` to update the current user's attribute when it changes.

!!! info "Important"

    If your application is already published and most users have already logged in, please manually set the user attributes once when integrate the Clickstream SDK for the first time to ensure that subsequent events contains user attributes.


#### Record event with items

You can add the following code to log an event with an item.

```java
import software.aws.solution.clickstream.ClickstreamAnalytcs;
import software.aws.solution.clickstream.ClickstreamItem;

ClickstreamItem item_book = ClickstreamItem.builder()
    .add(ClickstreamAnalytics.Item.ITEM_ID, "123")
    .add(ClickstreamAnalytics.Item.ITEM_NAME, "Nature")
    .add(ClickstreamAnalytics.Item.ITEM_CATEGORY, "book")
    .add(ClickstreamAnalytics.Item.PRICE, 99)
    .add("book_publisher", "Nature Research")
    .build();

ClickstreamEvent event = ClickstreamEvent.builder()
    .name("view_item")
    .add(ClickstreamAnalytics.Item.ITEM_ID, "123")
    .add(ClickstreamAnalytics.Item.CURRENCY, "USD")
    .add("event_category", "recommended")
    .setItems(new ClickstreamItem[] {item_book})
    .build();

ClickstreamAnalytics.recordEvent(event);
```

For logging more attribute in an item, please refer to [item attributes](#item-attributes).

!!! warning "Important"

    Only pipelines from version 1.1+ can handle items with custom attribute.

#### Send event immediately

```java
// for send event immediately.
ClickstreamAnalytics.flushEvent();
```

#### Disable SDK

You can disable the SDK in the scenario you need. After disabling the SDK, the SDK will not handle the logging and sending of any events. Of course you can enable the SDK when you need to continue logging events.

Please note that the disable and enable code needs to be run in the main thread.

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

// disable SDK
ClickstreamAnalytics.disable();

// enable SDK
ClickstreamAnalytics.enable();
```

#### Configuration update

After initializing the SDK, you can use the following code to customize the configuration of the SDK.

!!! info "Important"
    This configuration will override the default configuration in `amplifyconfiguration.json` file.

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

// config the SDK after initialize.
ClickstreamAnalytics.getClickStreamConfiguration()
        .withAppId("your appId")
        .withEndpoint("https://example.com/collect")
        .withAuthCookie("your authentication cookie")
        .withSendEventsInterval(10000)
        .withSessionTimeoutDuration(1800000)
        .withTrackScreenViewEvents(false)
        .withTrackUserEngagementEvents(false)
        .withTrackAppExceptionEvents(false)
        .withLogEvents(true)
        .withCustomDns(CustomOkhttpDns.getInstance())
        .withCompressEvents(true);
```

Here is an explanation of each method.

| Method name                     | Parameter type | Required | Default value | Description                                                                                 |
|---------------------------------|----------------|----------|---------------|---------------------------------------------------------------------------------------------|
| withAppId()                     | String         | true     | --            | the app id of your application in web console                                               |
| withEndpoint()                  | String         | true     | --            | the endpoint path you will upload the event to Clickstream ingestion server                 |
| withAuthCookie()                | String         | false    | --            | your auth cookie for AWS application load balancer auth cookie                              |
| withSendEventsInterval()        | long           | false    | 1800000       | event sending interval in milliseconds                                                      |
| withSessionTimeoutDuration()    | long           | false    | 5000          | the duration of the session timeout in milliseconds                                         |
| withTrackScreenViewEvents()     | boolean        | false    | true          | whether to auto-record screen view events                                                   |
| withTrackUserEngagementEvents() | boolean        | false    | true          | whether to auto-record user engagement events                                               |
| withTrackAppExceptionEvents()   | boolean        | false    | true          | whether to auto-record app exception events                                                 |
| withLogEvents()                 | boolean        | false    | false         | whether to automatically print event JSON for debugging events, [Learn more](#debug-events) |
| withCustomDns()                 | String         | false    | --            | the method for setting your custom DNS, [Learn more](#configure-custom-dns)                 |
| withCompressEvents()            | boolean        | false    | true          | whether to compress event content by gzip when uploading events.                            |

#### Debug events

You can follow the steps below to view the event raw JSON and debug your events.

1. Using `ClickstreamAnalytics.getClickStreamConfiguration()` api and set the `withLogEvents()` method with true in debug mode, for example:
    ```java
    import software.aws.solution.clickstream.ClickstreamAnalytics;
    
    // log the event in debug mode.
    ClickstreamAnalytics.getClickStreamConfiguration()
                .withLogEvents(BuildConfig.DEBUG);
    ```
2. Integrate the SDK and launch your app by Android Studio, then open the  **Logcat** window.
3. Input `EventRecorder` to the filter, and you will see the JSON content of all events recorded by Clickstream Android SDK.

#### Configure custom DNS

```java
import software.aws.solution.clickstream.ClickstreamAnalytics;

// config custom DNS.
ClickstreamAnalytics.getClickStreamConfiguration()
        .withCustomDns(CustomOkhttpDns.getInstance());
```

If you want to use custom DNS for network request, you can create your `CustomOkhttpDns` which implementation `okhttp3.Dns`, then configure `.withCustomDns(CustomOkhttpDns.getInstance())` to make it works, you can refer to the [example code](https://github.com/awslabs/clickstream-android/blob/main/clickstream/src/test/java/software/aws/solution/clickstream/IntegrationTest.java#L503-L516) .

## Data format definition

### Data types

Clickstream Android SDK supports the following data types.

| Data type | Range                                      | Example       |
|-----------|--------------------------------------------|---------------|
| int       | -2147483648 ~ 2147483647                   | 12            |
| long      | -9223372036854775808 ~ 9223372036854775807 | 26854775808   |
| double    | 4.9E-324 ~ 1.7976931348623157E308          | 3.14          |
| boolean   | true, false                                | true          |
| String    | max 1024 characters                        | "Clickstream" |

### Naming rules

1. The event name and attribute name cannot start with a number, and only contain uppercase and lowercase letters, numbers, and underscores. In case of an invalid event name, it will throw `IllegalArgumentException`. In case of an invalid attribute name or user attribute name, it will discard the attribute and record error.

2. Do not use `_` as prefix in an event name or attribute name, because the `_` prefix is reserved for the solution.

3. The event name and attribute name are case-sensitive, so `Add_to_cart` and `add_to_cart` will be recognized as two different event names.

### Event and attribute limitation

In order to improve the efficiency of querying and analysis, we apply limits to event data as follows:

| Name                                     | Suggestion                 | Hard limit           | Strategy                                                                           | Error code |
|------------------------------------------|----------------------------|----------------------|------------------------------------------------------------------------------------|------------|
| Event name invalid                       | --                         | --                   | discard event, print log and record `_clickstream_error` event                     | 1001       |
| Length of event name                     | under 25 characters        | 50 characters        | discard event, print log and record `_clickstream_error` event                     | 1002       |
| Length of event attribute name           | under 25 characters        | 50 characters        | discard the attribute,  print log and record error in event attribute              | 2001       |
| Attribute name invalid                   | --                         | --                   | discard the attribute,  print log and record error in event attribute              | 2002       |
| Length of event attribute value          | under 100 characters       | 1024 characters      | discard the attribute,  print log and record error in event attribute              | 2003       |
| Event attribute per event                | under 50 attributes        | 500 evnet attributes | discard the attribute that exceed, print log and record error in event attribute   | 2004       |
| User attribute number                    | under 25 attributes        | 100 user attributes  | discard the attribute that exceed, print log and record `_clickstream_error` event | 3001       |
| Length of User attribute name            | under 25 characters        | 50 characters        | discard the attribute, print log and record `_clickstream_error` event             | 3002       |
| User attribute name invalid              | --                         | --                   | discard the attribute, print log and record `_clickstream_error` event             | 3003       |
| Length of User attribute value           | under 50 characters        | 256 characters       | discard the attribute, print log and record `_clickstream_error` event             | 3004       |
| Item number in one event                 | under 50 items             | 100 items            | discard the item, print log and record error in event attribute                    | 4001       |
| Length of item attribute value           | under 100 characters       | 256 characters       | discard the item, print log and record error in event attribute                    | 4002       |
| Custom item attribute number in one item | under 10 custom attributes | 10 custom attributes | discard the item, print log and record error in event attribute                    | 4003       |
| Length of item attribute name            | under 25 characters        | 50 characters        | discard the item, print log and record error in event attribute                    | 4004       |
| Item attribute name invalid              | --                         | --                   | discard the item, print log and record error in event attribute                    | 4005       |

!!! info "Important"

    - The character limits are the same for single-width character languages (e.g., English) and double-width character languages (e.g., Chinese).
    - The limit of event attribute per event include preset attributes.
    - If the attribute or user attribute with the same name is added more than twice, the latest value will apply.
    - All errors that exceed the limit will be recorded `_error_code` and `_error_message` these two attribute in the event attributes.

## Preset events

### Automatically collected events

| Event name         | Triggered                                                                                                                                  | Event Attributes                                                                                                                                                                                                           |
|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| _first_open        | when the user launches an app the first time after installation                                                                            |                                                                                                                                                                                                                            |
| _session_start     | when a user first open the app or a user returns to the app after 30 minutes of inactivity period, [Learn more](#session-definition)       | 1. _session_id <br>2. _session_start_timestamp                                                                                                                                                                             |
| _screen_view       | when new screen is opens, [Learn more](#screen-view-definition)                                                                            | 1. _screen_name <br>2. _screen_id <br>3. _screen_unique_id <br>4. _previous_screen_name<br>5. _previous_screen_id<br>6. _previous_screen_unique_id<br/>7. _entrances<br>8. _previous_timestamp<br>9. _engagement_time_msec |
| _user_engagement   | when user navigates away from current screen and the screen is in focus for at least one second, [Learn more](#user-engagement-definition) | 1. _engagement_time_msec<br>                                                                                                                                                                                               |
| _app_start         | every time the app goes to visible                                                                                                         | 1. _is_first_time(when it is the first `_app_start` event after the application starts, the value is `true`)                                                                                                               |
| _app_end           | every time the app goes to invisible                                                                                                       |                                                                                                                                                                                                                            |
| _profile_set       | when the `addUserAttributes()` or `setUserId()` API is called                                                                              |                                                                                                                                                                                                                            |
| _app_exception     | when the app crashes                                                                                                                       | 1. _exception_message<br>2. _exception_stack                                                                                                                                                                               |
| _app_update        | when the app is updated to a new version and launched again                                                                                | 1. _previous_app_version                                                                                                                                                                                                   |
| _os_update         | when device operating system is updated to a new version                                                                                   | 1. _previous_os_version                                                                                                                                                                                                    |
| _clickstream_error | event_name is invalid or user attribute is invalid                                                                                         | 1. _error_code <br>2. _error_message                                                                                                                                                                                       |

### Session definition

In Clickstream Android SDK, we do not limit the total time of a session. As long as the time between the next entry of the app and the last exit time is within the allowable timeout period, the current session is considered to be continuous.

The `_session_start` event triggered when the app open for the first time, or the app was open to the foreground and the time between the last exit exceeded `session_time_out` period. The following are session-related attributes.

1. _session_id: We calculate the session id by concatenating the last 8 characters of uniqueId and the current millisecond, for example: dc7a7a18-20230905-131926703.
2. _session_duration : We calculate the session duration by minus the current event create timestamp and the session's `_session_start_timestamp`, this attribute will be added in every event during the session.
3. _session_number : The auto increment number of session in current device, the initial value is 1
4. Session timeout duration: By default is 30 minutes, which can be customized through the [configuration update](#configuration-update) api.

### Screen view definition

In Clickstream Android SDK, we define the `_screen_view` as an event that records a user's browsing path of screen, when a screen transition started, the `_screen_view` event will be recorded when meet any of the following conditions:

1. No screen was previously set.
2. The new screen name differs from the previous screen title.
3. The new screen id differ from the previous screen id.
4. The new screen unique id differ from the previous screen unique id.

This event listens for Activity's `onResume` lifecycle method to judgment the screen transition. In order to track screen browsing path, we use `_previous_screen_name` , `_previous_screen_id` and `_previous_screen_unique_id` to link the previous screen. In addition, there are some other attributes in screen view event.

1. _screen_unique_id: We calculate the screen unique id by getting the current screen's hashcode, for example: "126861252".
2. _entrances: The first screen view event in a session is 1, others is 0.
3. _previous_timestamp: The timestamp of the previous `_screen_view` event.
4. _engagement_time_msec: The previous page last engagement milliseconds.

### User engagement definition

In Clickstream Android SDK, we define the `_user_engagement` as an event that records the screen browsing time, and we only send this event when user leave the screen and the screen has focus for at least one second.

We define that users leave the screen in the following situations.

1. When the user navigates to another screen.
2. The user moves the app screen to the background.
3. The user exit the app, or kill the process of app.

**engagement_time_msec**: We calculate the milliseconds from when a screen is visible to when the user leave the screen.

## Event attributes

### Sample event structure

```json
{
	"hashCode": "80452b0",
	"unique_id": "c84ad28d-16a8-4af4-a331-f34cdc7a7a18",
	"event_type": "add_to_cart",
	"event_id": "460daa08-0717-4385-8f2e-acb5bd019ee7",
	"timestamp": 1667877566697,
	"device_id": "f24bec657ea8eff7",
	"platform": "Android",
	"os_version": "10",
	"make": "Samsung",
	"brand": "Samsung",
	"model": "TAS-AN00",
	"locale": "zh_CN_#Hans",
	"carrier": "CDMA",
	"network_type": "Mobile",
	"screen_height": 2259,
	"screen_width": 1080,
	"zone_offset": 28800000,
	"system_language": "zh",
	"country_code": "CN",
	"sdk_version": "0.7.1",
	"sdk_name": "aws-solution-clickstream-sdk",
	"app_version": "1.0",
	"app_package_name": "com.notepad.app",
	"app_title": "Notepad",
	"app_id": "notepad-4a929eb9",
	"user": {
		"_user_id": {
			"value": "312121",
			"set_timestamp": 1667877566697
		},
		"_user_name": {
			"value": "carl",
			"set_timestamp": 1667877566697
		},
		"_user_first_touch_timestamp": {
			"value": 1667877267895,
			"set_timestamp": 1667877566697
		}
	},
	"attributes": {
		"event_category": "recommended",
		"currency": "CNY",
		"_session_id": "dc7a7a18-20221108-031926703",
		"_session_start_timestamp": 1667877566703,
		"_session_duration": 391809,
		"_session_number": 1,
		"_screen_name": "ProductDetailActivity",
		"_screen_unique_id": "126861252"
	}
}
```

All user attributes will be stored in `user` object, and all custom and global attributes are in `attributes` object.

### Common attribute

| Attribute name   | Data type | Description                                                                                   | How to generate                                                                                                                                                                                                                                                         | Usage and purpose                                                                                     |
|------------------|-----------|-----------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| hashCode         | String    | the event object's hash code                                                                  | generated from `Integer.toHexString(AnalyticsEvent.hashCode())`                                                                                                                                                                                                         | distinguish different events                                                                          |
| app_id           | String    | the app_id for your app                                                                       | app_id was generated by clickstream solution when you register an app to a data pipeline                                                                                                                                                                                | identify the events for your apps                                                                     |
| unique_id        | String    | the unique id for user                                                                        | generated from `UUID.randomUUID().toString()` during the SDK first initialization<br>it will be changed if user logout and then login to a new user. When user re-login to the previous user in same device, the unique_id will be reset to the same previous unique_id | the unique id to identity different users and associating the behavior of logged-in and not logged-in |
| device_id        | String    | the unique id for device                                                                      | generated from `Settings.System.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID)`, <br>if Android ID is null or "", we will use UUID instead.                                                                                                        | distinguish different devices                                                                         |
| event_type       | String    | event name                                                                                    | set by developer or SDK                                                                                                                                                                                                                                                 | distinguish different events type                                                                     |
| event_id         | String    | the unique id for event                                                                       | generated from `UUID.randomUUID().toString()` when the event create                                                                                                                                                                                                     | distinguish different events                                                                          |
| timestamp        | long      | event create timestamp                                                                        | generated from `System.currentTimeMillis()` when event create                                                                                                                                                                                                           | data analysis needs                                                                                   |
| platform         | String    | the platform name                                                                             | for Android device is always "Android"                                                                                                                                                                                                                                  | data analysis needs                                                                                   |
| os_version       | String    | the platform version code                                                                     | generated from `Build.VERSION.RELEASE`                                                                                                                                                                                                                                  | data analysis needs                                                                                   |
| make             | String    | manufacturer of the device                                                                    | generated from `Build.MANUFACTURER`                                                                                                                                                                                                                                     | data analysis needs                                                                                   |
| brand            | String    | brand of the device                                                                           | generated from `Build.BRAND`                                                                                                                                                                                                                                            | data analysis needs                                                                                   |
| model            | String    | model of the device                                                                           | generated from `Build.MODEL`                                                                                                                                                                                                                                            | data analysis needs                                                                                   |
| carrier          | String    | the device network operator name                                                              | `TelephonyManager.getNetworkOperatorName()`<br>default is: "UNKNOWN"                                                                                                                                                                                                    | data analysis needs                                                                                   |
| network_type     | String    | the current device network type                                                               | "Mobile", "WIFI" or "UNKNOWN"<br>generated from `android.netConnectivityManager`                                                                                                                                                                                        | data analysis needs                                                                                   |
| screen_height    | int       | the absolute height of the available display size in pixels                                   | generated from `applicationContext.resources.displayMetrics.heightPixels`                                                                                                                                                                                               | data analysis needs                                                                                   |
| screen_width     | int       | the absolute width of the available display size in pixels                                    | generated from `applicationContext.resources.displayMetrics.widthPixels`                                                                                                                                                                                                | data analysis needs                                                                                   |
| zone_offset      | int       | the device raw offset from GMT in milliseconds.                                               | generated from `java.util.Calendar.get(Calendar.ZONE_OFFSET)`                                                                                                                                                                                                           | data analysis needs                                                                                   |
| locale           | String    | the default locale(language, country and variant) for this device of the Java Virtual Machine | generated from `java.util.Local.getDefault()`                                                                                                                                                                                                                           | data analysis needs                                                                                   |
| system_language  | String    | the device language code                                                                      | generated from `java.util.Local.getLanguage()`<br>default is: "UNKNOWN"                                                                                                                                                                                                 | data analysis needs                                                                                   |
| country_code     | String    | country/region code for this device                                                           | generated from `java.util.Local.getCountry()`<br>default is: "UNKNOWN"                                                                                                                                                                                                  | data analysis needs                                                                                   |
| sdk_version      | String    | clickstream sdk version                                                                       | generated from `BuildConfig.VERSION_NAME`                                                                                                                                                                                                                               | data analysis needs                                                                                   |
| sdk_name         | String    | clickstream sdk name                                                                          | this will always be "aws-solution-clickstream-sdk"                                                                                                                                                                                                                      | data analysis needs                                                                                   |
| app_version      | String    | the app version name of user's app                                                            | generated from `android.content.pm.PackageInfo.versionName`<br>default is: "UNKNOWN"                                                                                                                                                                                    | data analysis needs                                                                                   |
| app_package_name | String    | the app package name of user's app                                                            | generated from `android.content.pm.PackageInfo.packageName`<br>default is: "UNKNOWN"                                                                                                                                                                                    | data analysis needs                                                                                   |
| app_title        | String    | the app's display name                                                                        | generated from `android.content.pm.getApplicationLabel(appInfo)`                                                                                                                                                                                                        | data analysis needs                                                                                   |

### User attributes

| Attribute name              | Description                                                                                            |
|-----------------------------|--------------------------------------------------------------------------------------------------------|
| _user_id                    | Reserved for user id that is assigned by app                                                           |
| _user_ltv_revenue           | Reserved for user lifetime value                                                                       |
| _user_ltv_currency          | Reserved for user lifetime value currency                                                              |
| _user_first_touch_timestamp | Added to the user object for all events. The time (in milliseconds) when the user first opened the app |

### Event attributes

| Attribute name           | Data type | Auto track | Description                                                                                                                                                |
|--------------------------|-----------|------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| _traffic_source_medium   | String    | false      | Reserved for traffic medium. Use this attribute to store the medium that acquired user when events were logged. Example: Email, Paid search, Search engine |
| _traffic_source_name     | String    | false      | Reserved for traffic name. Use this attribute to store the marketing campaign that acquired user when events were logged. Example: Summer promotion        |
| _traffic_source_source   | String    | false      | Reserved for traffic source. Name of the network source that acquired the user when the event were reported. Example: Google, Facebook, Bing, Baidu        |
| _channel                 | String    | false      | Reserved for install source, it is the channel for app was downloaded                                                                                      |
| _session_id              | String    | true       | Added in all events.                                                                                                                                       |
| _session_start_timestamp | long      | true       | Added in all events.                                                                                                                                       |
| _session_duration        | long      | true       | Added in all events.                                                                                                                                       |
| _session_number          | int       | true       | Added in all events.                                                                                                                                       |
| _screen_name             | String    | true       | Added in all events.                                                                                                                                       |
| _screen_unique_id        | String    | true       | Added in all events.                                                                                                                                       |


### Item attributes

| Attribute name | Data type | Required | Description                   |
|----------------|-----------|----------|-------------------------------|
| id             | string    | False    | The id of the item            |
| name           | string    | False    | The name of the item          |
| brand          | string    | False    | The brand of the item         |
| currency       | string    | False    | The currency of the item      |
| price          | number    | False    | The price of the item         |
| quantity       | string    | False    | The quantity of the item      |
| creative_name  | string    | False    | The creative name of the item |
| creative_slot  | string    | False    | The creative slot of the item |
| location_id    | string    | False    | The location id of the item   |
| category       | string    | False    | The category of the item      |
| category2      | string    | False    | The category2 of the item     |
| category3      | string    | False    | The category3 of the item     |
| category4      | string    | False    | The category4 of the item     |
| category5      | string    | False    | The category5 of the item     |

You can use the above preset item attributes, of course, you can also add custom attributes to an item. In addition to the preset attributes, an item can add up to 10 custom attributes.


## Change log

[GitHub change log](https://github.com/awslabs/clickstream-android/releases)

## Reference link

[Source code](https://github.com/awslabs/clickstream-android)

[Project issue](https://github.com/awslabs/clickstream-android/issues)
