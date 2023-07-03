# Clickstream Swift SDK

## Introduction

Clickstream Swift SDK can help you easily collect in-app click stream data from iOS devices to your AWS environments through the data pipeline provisioned by this solution.

The SDK is based on the Amplify for Swift SDK Core Library and developed according to the Amplify Swift SDK plug-in specification. In addition, the SDK provides features that automatically collect common user events and attributes (for example, screen view, and first open) to accelerate data collection for users.

### Platform Support

Clickstream Swift SDK supports iOS 13+.

[**API Documentation**](https://awslabs.github.io/clickstream-swift/)

## Integrate SDK

Clickstream requires Xcode 13.4 or higher to build.

### 1.Add Package

We use **Swift Package Manager** to distribute Clickstream Swift SDK, open your project in Xcode and select **File > Add Packages**.

![](../images/sdk-manual/swift_add_package.png)

Enter the Clickstream Library for Swift GitHub repo URL (`https://github.com/awslabs/clickstream-swift`) into the search bar, You'll see the Clickstream Library for Swift repository rules for which version of Clickstream you want Swift Package Manager to install. Choose **Up to Next Major Version**, then click **Add Package**, make the Clickstream product checked as default, and click **Add Package** again.

![](../images/sdk-manual/swift_add_package_url.png)

### 2.Parameter configuration

Download your `amplifyconfiguration.json` file from your Clickstream solution control plane, and paste it to your project root folder:

![](../images/sdk-manual/swift_add_amplify_config_json_file.png)

the json file will be as follows:

```json
{
  "analytics": {
    "plugins": {
      "awsClickstreamPlugin ": {
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

Your `appId` and `endpoint` are already set up in it, here's an explanation of each property:

- **appId**: the app id of your project in control plane.
- **endpoint**: the endpoint url you will upload the event to AWS server.
- **isCompressEvents**: whether to compress event content when uploading events, default is `true`
- **autoFlushEventsInterval**: event sending interval, the default is `10s`
- **isTrackAppExceptionEvents**: whether auto track exception event in app, default is `false`

### 3.Initialize the SDK

Once you have configured the parameters, you need to initialize it in AppDelegate's `didFinishLaunchingWithOptions` lifecycle method to use the SDK.

```swift
import Clickstream
...
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Override point for customization after application launch.
    do {
        try ClickstreamAnalytics.initSDK()
    } catch {
        assertionFailure("Fail to initialize ClickstreamAnalytics: \(error)")
    }
    return true
}
```

### 4.Config the SDK

```swift
import Clickstream

// config the sdk after initialize.
do {
    var configuration = try ClickstreamAnalytics.getClickstreamConfiguration()
    configuration.appId = "appId"
    configuration.endpoint = "https://example.com/collect"
    configuration.authCookie = "your authentication cookie"
    configuration.sessionTimeoutDuration = 1800000
    configuration.isLogEvents = true
    configuration.isCompressEvents = true    
    configuration.isLogEvents = true
} catch {
    print("Failed to config ClickstreamAnalytics: \(error)")
}
```

> Note: this configuation will override the default configuation in `amplifyconfiguration.json` file

### 5.Record event

Add the following code where you need to report an event.

```swift
import Clickstream

let attributes: ClickstreamAttribute = [
    "channel": "apple",
    "uccessful": true,
    "ProcessDuration": 12.33,
    "UserAge": 20,
]
ClickstreamAnalytics.recordEvent(eventName: "testEvent", attributes: attributes)

// for record an event directly
ClickstreamAnalytics.recordEvent(eventName: "button_click")
```

For more usage refer to [Github start using](https://github.com/awslabs/clickstream-swift#start-using)

For **Objective-c** project refer to [ClickstreamObjc Api Reference](https://awslabs.github.io/clickstream-swift/Classes/ClickstreamObjc.html)

## Data format definition

### Data type

Clickstream Swift SDK supports the following data types:

| Data type | Range                                                 | Sample        |
| --------- |-------------------------------------------------------| ------------- |
| Int       | -2147483648～2147483647                                | 12            |
| Int64     | -9,223,372,036,854,775,808～ 9,223,372,036,854,775,807 | 26854775808   |
| Double    | -2.22E-308~1.79E+308                                  | 3.14          |
| Boolean   | true, false                                           | true          |
| String    | max support 1024 characters                           | "clickstream" |

### Naming rules

1. The event name and attribute name cannot start with a number, and only contains uppercase and lowercase letters, numbers, underscores, if the event name is invalid will throw `precondition failure`, if the attribute or user attribute name is invalid the attribute will discard and record error.

2. Do not use `_` as prefix to naming event name and attribute name, `_` prefix is the reserved from Clickstream Analytics.

3. The event name and attribute name are in case sensitive, So the event `Add_to_cart` and `add_to_cart` will be Recognized as two different event.

### Event & Attribute Limitation

In order to improve the efficiency of querying and analysis, we need to limit events as follows:

| Name                            | Suggestion          | Hard limit          | Handle strategy for exceed    |
| ------------------------------- | ------------------- | ------------------- | ----------------------------- |
| Length of event name            | under 25 character  | 50 character        | throw error                   |
| Length of event attribute name  | under 25 character  | 50 character        | discard, log and record error |
| Length of event attribute value | under 100 character | 1024 character      | discard, log and record error |
| Event attribute per event       | under 50 attribute  | 500 event attribute | discard, log and record error |
| User attribute number           | under 25 attribute  | 100 user attribute  | discard, log and record error |
| Length of User attribute name   | under 25 character  | 50 character        | discard, log and record error |
| Length of User attribute value  | under 50 character  | 256 character       | discard, log and record error |

**Explanation of limits**

- The character limits are the same for single-width character languages (e.g., English) and double-width character languages (e.g., Chinese).
- The limit of event attribute per event include common attributes and preset attributes.
- If you add the same name of attribute or user attribute more than twice, the last value applies.

## Preset events and attributes

### Preset events

Automatically collected events:

| Event name       | When to trigger                                                                       | Event Attributes                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| _session_start   | when users app come to foreground for the first time and their is no on-going session | _session_id <br>_session_start_timestamp<br>_session_duration                                                     |
| _screen_view     | when the activity callback `onResume()` method                                        | _screen_name<br>_screen_id<br>_previous_screen_name<br>_previous_screen_id<br>_entrances<br>_engagement_time_msec |
| _app_exception   | when the app is crash.                                                                | _exception_message<br>_exception_stack                                                                            |
| _app_update      | when the app is updated to a new version and launched again                           | _previous_app_version                                                                                             |
| _first_open      | the first time user launches an app after installing                                  |                                                                                                                   |
| _os_update       | device operating system is updated to a new version                                   | _previous_os_version                                                                                              |
| _user_engagement | when the app is in the foreground at least one second                                 | _engagement_time_msec<br>                                                                                         |
| _profile_set     | when the `addUserAttributes()` or `setUserId()` api called.                           |                                                                                                                   |

#### Session definition

In Clickstream Swift SDK, we do not limit the total time of a session, as long as the time between the next entry of the app and the last exit time is within the allowable timeout period, we consider the current session to be continuous.

- **_session_start**: When the app starts for the first time, or the app was launched to the foreground and the time between the last exit exceeded `session_time_out` period.

- **_session_duration**: We calculate the `_session_duration` by minus the current event create timestamp and the session's `_session_start_timestamp`, this attribute will be added in every event during the session.

- **session_time_out**: By default is 30 minutes, which can be customized through the configuration api.

- **_session_number**: The total number of session distinct by session id, and `_session_number` will be appear in every event's attribute object.

#### User engagement definition

In Clickstream Swift SDK, we define the `user_engagement` as the app is in the foreground at least one second.

- **when to send**: We send the event when the app navigate to background or navigate to another app.

- **engagement_time_msec**: We count the time from when the app comes in the foreground to when the app goes to the background..

### Common attributes and Reserved attributes

#### Event structure sample

```json
{
    "app_id": "Shopping",
    "app_package_name": "com.compny.app",
    "app_title": "ModerneShopping",
    "app_version": "1.0",
    "brand": "apple",
    "carrier": "UNKNOWN",
    "country_code": "US",
    "device_id": "A536A563-65BD-49BE-A6EC-6F3CE7AC8FBE",
    "device_unique_id": "",
    "event_id": "91DA4BBE-933F-4DFA-A489-8AEFBC7A06D8",
    "event_type": "add_to_cart",
    "hashCode": "63D7991D",
    "locale": "en_US (current)",
    "make": "apple",
    "model": "iPhone 14 Pro",
    "network_type": "WIFI",
    "os_version": "16.4",
    "platform": "iOS",
    "screen_height": 2556,
    "screen_width": 1179,
    "sdk_name": "aws-solution-clickstream-sdk",
    "sdk_version": "0.4.1",
    "system_language": "en",
    "timestamp": 1685082174195,
    "unique_id": "0E6614B7-2D2C-4774-AB2F-B0A9E6C3BFAC",
    "zone_offset": 28800000,
    "user": {
        "_user_city": {
            "set_timestamp": 1685006678437,
            "value": "Shanghai"
        },
        "_user_first_touch_timestamp": {
            "set_timestamp": 1685006678434,
            "value": 1685006678432
        },
        "_user_name": {
            "set_timestamp": 1685006678437,
            "value": "carl"
        }
    },
    "attributes": {
        "_session_duration": 15349,
        "_session_id": "0E6614B7-20230526-062238846",
        "_session_number": 3,
        "_session_start_timestamp": 1685082158847,
        "product_category": "men's clothing",
        "product_id": 1
    }
}
```

All user attributes will be included in `user` object, and all custom and global attribute are stored in `attributes` object.

#### Common attribute explanation

| attribute        | describe                                                          | how to generate                                                                                                                                                                                                                                     | use and purpose                                                                                      |
| ---------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| hashCode         | the AnalyticsEvent Object's hashCode                              | generate from`String(format: "%08X", hasher.combine(eventjson))`                                                                                                                                                                                    | distinguish different event                                                                          |
| app_id           | clickstram app id                                                 | generated when clickstream app create from solution control plane.                                                                                                                                                                                  | identify the events for your apps                                                                    |
| unique_id        | the unique id for user                                            | generate from `UUID().uuidString` when the sdk first initialization<br>it will be changed after user relogin to another user, and when user relogin to the before user in same device, the `unique_id` will reset to the before user's `unique_id`. | the unique for identity different user and associating the behavior of logging in and not logging in |
| device_id        | the unique id for device                                          | generate from`UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString`<br>it will be changed after app reinstall<br>                                                                                                                  | distinguish different device                                                                         |
| device_unique_id | the device advertising Id                                         | generate from`ASIdentifierManager.shared().advertisingIdentifier.uuidString ?? ""`                                                                                                                                                                  | distinguish different device                                                                         |
| event_type       | event name                                                        | set by user or sdk.                                                                                                                                                                                                                                 | distinguish different event type                                                                     |
| event_id         | the unique id for event                                           | generate from `UUID().uuidString` when the event create.                                                                                                                                                                                            | distinguish each event                                                                               |
| timestamp        | event create timestamp                                            | generate from `Date().timeIntervalSince1970 * 1000` when event create                                                                                                                                                                               | data analysis needs                                                                                  |
| platform         | the platform name                                                 | for iOS device is always "iOS"                                                                                                                                                                                                                      | data analysis needs                                                                                  |
| os_version       | the iOS os version                                                | generate from`UIDevice.current.systemVersion`                                                                                                                                                                                                       | data analysis needs                                                                                  |
| make             | manufacturer of the device                                        | for iOS device is always "apple"                                                                                                                                                                                                                    | data analysis needs                                                                                  |
| brand            | brand of the device                                               | for iOS device is always "apple"                                                                                                                                                                                                                    | data analysis needs                                                                                  |
| model            | model of the device                                               | generate from mapping of device identifier                                                                                                                                                                                                          | data analysis needs                                                                                  |
| carrier          | the device network operator name                                  | generate from`CTTelephonyNetworkInfo().serviceSubscriberCellularProviders?.first?.value`<br>default is: "UNKNOWN"                                                                                                                                   | data analysis needs                                                                                  |
| network_type     | the current device network type                                   | "Mobile", "WIFI" or "UNKNOWN"<br>generate by  `NWPathMonitor`                                                                                                                                                                                       | data analysis needs                                                                                  |
| screen_height    | The absolute height of the available display size in pixels       | generate from`UIScreen.main.bounds.size.height * UIScreen.main.scale`                                                                                                                                                                               | data analysis needs                                                                                  |
| screen_width     | The absolute width of the available display size in pixels.       | generate from`UIScreen.main.bounds.size.width * UIScreen.main.scale`                                                                                                                                                                                | data analysis needs                                                                                  |
| zone_offset      | the divece raw offset from GMT in milliseconds.                   | generate from`TimeZone.current.secondsFromGMT()*1000`                                                                                                                                                                                               | data analysis needs                                                                                  |
| locale           | the default locale(language, country and variant) for this device | generate from `Locale.current`                                                                                                                                                                                                                      | data analysis needs                                                                                  |
| system_language  | the devie language code                                           | generate from `Locale.current.languageCode`<br>default is: "UNKNOWN"                                                                                                                                                                                | data analysis needs                                                                                  |
| country_code     | country/region code for this device                               | generate from `Locale.current.regionCode`<br>default is: "UNKNOWN"                                                                                                                                                                                  | data analysis needs                                                                                  |
| sdk_version      | clickstream sdk version                                           | generate from`PackageInfo.version`                                                                                                                                                                                                                  | data analysis needs                                                                                  |
| sdk_name         | clickstream sdk name                                              | this will always be `aws-solution-clickstream-sdk`                                                                                                                                                                                                  | data analysis needs                                                                                  |
| app_version      | the app version name                                              | generate from `Bundle.main.infoDictionary["CFBundleShortVersionString"] ?? ""`                                                                                                                                                                      | data analysis needs                                                                                  |
| app_package_name | the app package name                                              | generate from`Bundle.main.infoDictionary["CFBundleIdentifier"] ?? ""`                                                                                                                                                                               | data analysis needs                                                                                  |
| app_title        | the app's display name                                            | generate from `Bundle.main.infoDictionary["CFBundleName"] ?? ""`                                                                                                                                                                                    | data analysis needs                                                                                  |

#### Reserved attributes

**User attributes**

| attribute name              | description                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| _user_id                    | Reserved for user id that is assigned by app                                                                                          |
| _user_ltv_revenue           | Reserved for user lifetime value                                                                                                      |
| _user_ltv_currency          | Reserved for user lifetime value currency                                                                                             |
| _user_first_touch_timestamp | The time (in microseconds) at which the user first opened the app or visited the site, it is included in every event in `user` object |

**Reserved attributes**

| attribute name           | description                                                                                                               |
| ------------------------ |---------------------------------------------------------------------------------------------------------------------------|
| _traffic_source_medium   | Reserved for traffic medium, use this attribute to store the medium that acquired user when events were logged.           |
| _traffic_source_name     | Reserved for traffic name, use this attribute to store the marketing campaign that acquired user when events were logged. |
| _traffic_source_source   | Reserved for traffic source,  Name of the network source that acquired the user when the event were reported.             |
| _channel                 | the channel for app was downloaded                                                                                        |
| _device_vendor_id        | Vendor id of the device                                                                                                   |
| _device_advertising_id   | Advertising id of the device                                                                                              |
| _entrances               | added in `_screen_view` event , the first `_screen_view` event in a session the value is 1, others is 0.                  |
| _session_id              | added in all event.                                                                                                       |
| _session_start_timestamp | added in all event.                                                                                                       |
| _session_duration        | added in all event.                                                                                                       |
| _session_number          | added in all event, the initial value is 1, automatically increment by user device.                                       |