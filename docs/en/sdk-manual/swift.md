# Clickstream Swift SDK

## Introduction

Clickstream Swift SDK can help you easily collect in-app click stream data from iOS devices to your AWS environments through the data pipeline provisioned by this solution.

The SDK is based on the Amplify for Swift SDK Core Library and developed according to the Amplify Swift SDK plug-in specification. In addition, the SDK provides features that automatically collect common user events and attributes (for example, screen view, and first open) to accelerate data collection for users.

### Platform Support

Clickstream Swift SDK supports iOS 13+.

Clickstream Swift SDK requires Xcode 13.4 or higher to build.

## Integrate SDK

### 1.Add Package

We use **Swift Package Manager(SPM)** to distribute Clickstream Swift SDK, open your project in Xcode and select **File > Add Packages**.

![](../images/sdk-manual/swift_add_package.png)

1. Copy the Clickstream Swift SDK GitHub repository URL and paste it into the search bar.
    ```bash
    https://github.com/awslabs/clickstream-swift
    ```
2. Check the rules for the version of the SDK that you want Swift Package Manager to install, it is recommended to choose **Up to Next Major Version**, then click **Add Package**.
3. Keep the Clickstream product checked as default.
4. Choose **Add Package** again to finish the package installation.

![](../images/sdk-manual/swift_add_package_url.png)

### 2.Parameter configuration

Download your `amplifyconfiguration.json` file from your Clickstream solution web console, and paste it to your project root folder.

![](../images/sdk-manual/swift_add_amplify_config_json_file.png)

the JSON file will be as follows:

```json
{
  "analytics": {
    "plugins": {
      "awsClickstreamPlugin ": {
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

Your `appId` and `endpoint` are already set up in it, here's an explanation of each property:

- **appId (Required)**: the app id of your project in web console.
- **endpoint (Required)**: the endpoint url you will upload the event to AWS server.
- **isCompressEvents**: whether to compress event content when uploading events, default is `true`
- **autoFlushEventsInterval**: event sending interval, the default is `10s`
- **isTrackAppExceptionEvents**: whether auto track exception event in app, default is `false`

### 3.Initialize the SDK

Once you have configured the parameters, you need to initialize it in AppDelegate's `didFinishLaunchingWithOptions` lifecycle method to use the SDK.

=== "Swift"
    ```swift
    import Clickstream
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        do {
            try ClickstreamAnalytics.initSDK()
        } catch {
            assertionFailure("Fail to initialize ClickstreamAnalytics: \(error)")
        }
        return true
    }
    ```
=== "Objective-C"
    ```objective-c
    @import Clickstream;
    
    - (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions { 
        NSError *error = nil;
        [ClickstreamObjc initSDKAndReturnError:&error];
        if (error) {
            NSLog(@"Fail to initialize ClickstreamAnalytics: %@", error.localizedDescription);
        }
        return YES;
    }
    ```

If your project is developed with SwiftUI, you need to create an application delegate and attach it to your `App` through `UIApplicationDelegateAdaptor`.

```swift
@main
struct YourApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    var body: some Scene {
        WindowGroup {
            YourView()
        }
    }
}
```

For SwiftUI, we do not yet support automatic collection of screen view events, you need to disable screen view event by setting `configuration.isTrackScreenViewEvents = false`, see the [configuration](#configuration-update) steps.

### 4.Start  using

#### Record event

Add the following code where you need to record event.

=== "Swift"
    ```swift
    import Clickstream
    
    // for record an event with custom attributes
    let attributes: ClickstreamAttribute = [
        "category": "shoes",
        "currency": "CNY",
        "value": 279.9
    ]
    ClickstreamAnalytics.recordEvent("button_click", attributes)
    
    // for record an event directly
    ClickstreamAnalytics.recordEvent("button_click")
    ```
=== "Objective-C"
    ```objective-c
    import Clickstream;
    
    // for record an event with custom attributes
    NSDictionary *attributes =@{
        @"category": @"shoes",
        @"currency": @"CNY",
        @"value": @12.34
    };
    [ClickstreamObjc recordEvent:@"button_click" :attributes];
    
    // for record an event directly
    [ClickstreamObjc recordEvent:@"button_click"];
    ```

#### Add global attribute

=== "Swift"
    ```swift
    import Clickstream
    
    let globalAttribute: ClickstreamAttribute = [
        "channel": "apple",
        "class": 6,
        "level": 5.1,
        "isOpenNotification": true,
    ]
    ClickstreamAnalytics.addGlobalAttributes(globalAttribute)
    
    // for delete an global attribute
    ClickstreamAnalytics.deleteGlobalAttributes("level")
    ```
=== "Objective-C"
    ```objective-c
    import Clickstream;
    
    NSDictionary *attributes =@{
        @"channel": @"apple",
        @"class": @6,
        @"level": @5.1,
        @"isOpenNotification": @YES
    };
    [ClickstreamObjc addGlobalAttributes :attributes];
    
    // for delete an global attribute
    [ClickstreamObjc deleteGlobalAttributes: @[@"level"]];
    ```

Please add the global attribute after the SDK initialization is completed, the global attribute will be added to the attribute object in all events.

#### Login and logout

=== "Swift"
    ```swift
    import Clickstream
    
    // when user login usccess.
    ClickstreamAnalytics.setUserId("userId")
    
    // when user logout
    ClickstreamAnalytics.setUserId(nil)
    ```
=== "Objective-C"

    ```objective-c
    import Clickstream;
    
    // when user login usccess.
    [ClickstreamObjc setUserId:@"userId"];
    
    // when user logout
    [ClickstreamObjc setUserId:NULL];
    ```

#### Add user attribute

=== "Swift"

    ```swift
    import Clickstream
    
    let userAttributes : ClickstreamAttribute=[
        "_user_age": 21,
        "_user_name": "carl"
    ]
    ClickstreamAnalytics.addUserAttributes(userAttributes)
    ```

=== "Objective-C"

    ```objective-c
    import Clickstream;
    
    NSDictionary *userAttributes =@{
        @"_user_age": @21,
        @"user_name": @"carl"
    };
    [ClickstreamObjc addUserAttributes:userAttributes];
    ```

Current login user's attributes will be cached in disk, so the next time app launch you don't need to set all user's attribute again, of course you can use the same api `ClickstreamAnalytics.addUserAttributes()` to update the current user's attribute when it changes.

!!! info "Important"

    If your application is already published and most users have already logged in, please manually set the user attributes once when integrate the Clickstream SDK for the first time to ensure that subsequent events contains user attributes.

#### Send event immediately
=== "Swift"

    ```swift
    import Clickstream
    // for send event immediately.
    ClickstreamAnalytics.flushEvents()
    ```

=== "Objective-C"

    ```objective-c
    import Clickstream;
    // for send event immediately.
    [ClickstreamObjc flushEvents];
    ```

#### Disable SDK

You can disable the SDK in the scenario you need. After disabling the SDK, the SDK will not handle the logging and sending of any events. Of course you can enable the SDK when you need to continue logging events.

=== "Swift"

    ```swift
    import Clickstream
    
    // disable SDK
    ClickstreamAnalytics.disable()
    
    // enable SDK
    ClickstreamAnalytics.enable()
    ```

=== "Objective-C"

    ```objective-c
    import Clickstream;
    
    // disable SDK
    [ClickstreamObjc disable];
    
    // enable SDK
    [ClickstreamObjc enable];
    ```

#### Configuration update

After initializing the SDK, you can use the following code to customize the configuration of the SDK.

=== "Swift"

    ```swift
    import Clickstream
    
    // config the sdk after initialize.
    do {
        var configuration = try ClickstreamAnalytics.getClickstreamConfiguration()
        configuration.appId = "your appId"
        configuration.endpoint = "https://example.com/collect"
        configuration.authCookie = "your authentication cookie"
        configuration.sessionTimeoutDuration = 1800000
        configuration.isTrackScreenViewEvents = false
        configuration.isTrackUserEngagementEvents = false
        configuration.isLogEvents = true
        configuration.isCompressEvents = true
    } catch {
        print("Failed to config ClickstreamAnalytics: \(error)")
    }
    ```

=== "Objective-C"

    ```objective-c
    import Clickstream;
    
    // config the sdk after initialize.
    ClickstreamContextConfiguration *configuration = [ClickstreamObjc getClickstreamConfigurationAndReturnError:&error];
    if (configuration) {
        [configuration setAppId:@"your appId"];
        [configuration setEndpoint:@"https://example.com/collect"];
        [configuration setAuthCookie:@"your authentication cookie"];
        [configuration setSessionTimeoutDuration:1800000];
        [configuration setIsTrackScreenViewEvents:0];
        [configuration setIsTrackUserEngagementEvents:0];
        [configuration setIsLogEvents:1];
        [configuration setIsCompressEvents:1];
    }else{
        NSLog(@"Failed to get configuration: %@", error.localizedDescription);
    }
    ```

> Note: this configuration will override the default configuration in `amplifyconfiguration.json` file

Here is an explanation of each option.

| Method name                 | Parameter type | Required | Default value | Description                                                                                 |
|-----------------------------|----------------|----------|---------------|---------------------------------------------------------------------------------------------|
| appId                       | String         | true     | --            | the app id of your application in web console                                               |
| endpoint                    | String         | true     | --            | the endpoint path you will upload the event to Clickstream ingestion server                 |
| authCookie                  | String         | false    | --            | your auth cookie for AWS application load balancer auth cookie                              |
| sessionTimeoutDuration      | Int64          | false    | 1800000       | the duration for session timeout in milliseconds                                            |
| isTrackScreenViewEvents     | Bool           | false    | true          | whether to auto-record screen view events                                                   |
| isTrackUserEngagementEvents | Bool           | false    | true          | whether to auto-record user engagement events                                               |
| isLogEvents                 | Bool           | false    | false         | whether to automatically print event JSON for debugging events, [Learn more](#debug-events) |
| isCompressEvents            | Bool           | false    | true          | whether to compress event content by gzip when uploading events                             |

#### Debug events

You can follow the steps below to view the event raw JSON and debug your events.

1. set the `isLogEvents` option with true in debug mode.
2. Integrate the SDK and launch your app by Xcode, then open the log panel.
3. Input `EventRecorder` to the filter, and you will see the JSON content of all events recorded by Clickstream Swift SDK.

## Data format definition

### Data type

Clickstream Swift SDK supports the following data types:

| Data type | Range                                                 | Sample        |
|-----------|-------------------------------------------------------|---------------|
| Int       | -2147483648～2147483647                                | 12            |
| Int64     | -9,223,372,036,854,775,808～ 9,223,372,036,854,775,807 | 26854775808   |
| Double    | -2.22E-308~1.79E+308                                  | 3.14          |
| Boolean   | true, false                                           | true          |
| String    | max support 1024 characters                           | "clickstream" |

### Naming rules

1. The event name and attribute name cannot start with a number, and only contains uppercase and lowercase letters, numbers, underscores, if the event name is invalid will throw `precondition failure`, if the attribute or user attribute name is invalid the attribute will be discarded and record error.

2. Do not use `_` as prefix to naming event name and attribute name, `_` prefix is the reserved from Clickstream Analytics.

3. The event name and attribute name are in case-sensitive, So the event `Add_to_cart` and `add_to_cart` will be recognized as two different event.

### Event and Attribute Limitation

In order to improve the efficiency of querying and analysis, we need to limit events as follows:

| Name                            | Suggestion           | Hard limit           | Strategy                                                                           | Error code |
|---------------------------------|----------------------|----------------------|------------------------------------------------------------------------------------|------------|
| Event name invalid              | --                   | --                   | discard event, print log and record `_clickstream_error` event                     | 1001       |
| Length of event name            | under 25 characters  | 50 characters        | discard event, print log and record `_clickstream_error` event                     | 1002       |
| Length of event attribute name  | under 25 characters  | 50 characters        | discard the attribute,  print log and record error in event attribute              | 2001       |
| Attribute name invalid          | --                   | --                   | discard the attribute,  print log and record error in event attribute              | 2002       |
| Length of event attribute value | under 100 characters | 1024 characters      | discard the attribute,  print log and record error in event attribute              | 2003       |
| Event attribute per event       | under 50 attributes  | 500 evnet attributes | discard the attribute that exceed, print log and record error in event attribute   | 2004       |
| User attribute number           | under 25 attributes  | 100 user attributes  | discard the attribute that exceed, print log and record `_clickstream_error` event | 3001       |
| Length of User attribute name   | under 25 characters  | 50 characters        | discard the attribute, print log and record `_clickstream_error` event             | 3002       |
| User attribute name invalid     | --                   | --                   | discard the attribute, print log and record `_clickstream_error` event             | 3003       |
| Length of User attribute value  | under 50 characters  | 256 characters       | discard the attribute, print log and record `_clickstream_error` event             | 3004       |

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

In Clickstream Swift SDK, we do not limit the total time of a session. As long as the time between the next entry of the app and the last exit time is within the allowable timeout period, the current session is considered to be continuous.

The `_session_start` event triggered when the app open for the first time, or the app was open to the foreground and the time between the last exit exceeded `session_time_out` period. The following are session-related attributes.

1. _session_id: We calculate the session id by concatenating the last 8 characters of uniqueId and the current millisecond, for example: dc7a7a18-20230905-131926703.
2. _session_duration : We calculate the session duration by minus the current event create timestamp and the session's `_session_start_timestamp`, this attribute will be added in every event during the session.
3. _session_number : The auto increment number of session in current device, the initial value is 1
4. Session timeout duration: By default is 30 minutes, which can be customized through the [configuration update](#configuration-update) api.

### Screen view definition

In Clickstream Swift SDK, we define the `_screen_view` as an event that records a user's browsing path of screen, when a screen transition started, the `_screen_view` event will be recorded when meet any of the following conditions:

1. No screen was previously set.
2. The new screen name differs from the previous screen title.
3. The new screen id differ from the previous screen id.
4. The new screen unique id differ from the previous screen unique id.

This event listens for UIViewController's `onViewDidAppear` lifecycle method to judgment the screen transition. In order to track screen browsing path, we use `_previous_screen_name` , `_previous_screen_id` and `_previous_screen_unique_id` to link the previous screen. In addition, there are some other attributes in screen view event.

1. _screen_unique_id: We calculate the screen unique id by getting the current screen's hash value, for example: "5260751568".
2. _entrances: The first screen view event in a session is 1, others is 0.
3. _previous_timestamp: The timestamp of the previous `_screen_view` event.
4. _engagement_time_msec: The previous page last engagement milliseconds.

### User engagement definition

In Clickstream Swift SDK, we define the `_user_engagement` as an event that records the screen browsing time, and we only send this event when user leave the screen and the screen has focus for at least one second.

We define that users leave the screen in the following situations.

1. When the user navigates to another screen.
2. The user moves the app screen to the background.
3. The user exit the app, or kill the process of app.

**engagement_time_msec**: We calculate the milliseconds from when a screen is visible to when the user leave the screen.

## Event attributes

### Sample event structure

```json
{
    "app_id": "Shopping",
    "app_package_name": "com.company.app",
    "app_title": "Shopping",
    "app_version": "1.0",
    "brand": "apple",
    "carrier": "UNKNOWN",
    "country_code": "US",
    "device_id": "A536A563-65BD-49BE-A6EC-6F3CE7AC8FBE",
    "device_unique_id": "",
    "event_id": "91DA4BBE-933F-4DFA-A489-8AEFBC7A06D8",
    "event_type": "add_to_cart",
    "hashCode": "63D7991D",
    "locale": "en_US",
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
        "event_category": "recommended",
        "currency": "CNY",
        "_session_duration": 15349,
        "_session_id": "0E6614B7-20230526-062238846",
        "_session_number": 3,
        "_session_start_timestamp": 1685082158847,
        "_screen_name": "ProductDetailViewController",
        "_screen_unique_id": "5260751568"
    }
}
```

All user attributes will be included in `user` object, and all custom and global attribute are stored in `attributes` object.

### Common attribute

| Attribute name    | Data type | Description                                                       | How to generate                                                                                                                                                                                                                                            | Usage and purpose                                                                                     |
|-------------------|-----------|-------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| hashCode          | String    | the AnalyticsEvent Object's hashCode                              | generated from`String(format: "%08X", hasher.combine(eventjson))`                                                                                                                                                                                          | distinguish different events                                                                          |
| app_id            | String    | the app_id for your app                                           | app_id was generated by clickstream solution when you register an app to a data pipeline                                                                                                                                                                   | identify the events for your apps                                                                     |
| unique_id         | String    | the unique id for user                                            | generated from `UUID().uuidString` when the sdk first initialization<br>it will be changed if user logout and then login to a new user. When user re-login to the previous user in same device, the unique_id will be reset to the same previous unique_id | the unique id to identity different users and associating the behavior of logged-in and not logged-in |
| device_id         | String    | the unique id for device                                          | generated from`UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString`<br>it will be changed after app reinstall<br>                                                                                                                        | distinguish different devices                                                                         |
| device_unique_id  | String    | the device advertising Id                                         | generated from`ASIdentifierManager.shared().advertisingIdentifier.uuidString ?? ""`                                                                                                                                                                        | distinguish different devices                                                                         |
| event_type        | String    | event name                                                        | set by user or sdk.                                                                                                                                                                                                                                        | distinguish different events type                                                                     |
| event_id          | String    | the unique id for event                                           | generated from `UUID().uuidString` when the event create.                                                                                                                                                                                                  | distinguish different events                                                                          |
| timestamp         | Int64     | event create timestamp                                            | generated from `Date().timeIntervalSince1970 * 1000` when event create                                                                                                                                                                                     | data analysis needs                                                                                   |
| platform          | String    | the platform name                                                 | for iOS device is always "iOS"                                                                                                                                                                                                                             | data analysis needs                                                                                   |
| os_version        | String    | the iOS os version                                                | generated from`UIDevice.current.systemVersion`                                                                                                                                                                                                             | data analysis needs                                                                                   |
| make              | String    | manufacturer of the device                                        | for iOS device is always "apple"                                                                                                                                                                                                                           | data analysis needs                                                                                   |
| brand             | String    | brand of the device                                               | for iOS device is always "apple"                                                                                                                                                                                                                           | data analysis needs                                                                                   |
| model             | String    | model of the device                                               | generated from mapping of device identifier                                                                                                                                                                                                                | data analysis needs                                                                                   |
| carrier           | String    | the device network operator name                                  | generated from`CTTelephonyNetworkInfo().serviceSubscriberCellularProviders?.first?.value`<br>default is: "UNKNOWN"                                                                                                                                         | data analysis needs                                                                                   |
| network_type      | String    | the current device network type                                   | "Mobile", "WIFI" or "UNKNOWN"<br>generate by  `NWPathMonitor`                                                                                                                                                                                              | data analysis needs                                                                                   |
| screen_height     | int       | The absolute height of the available display size in pixels       | generated from`UIScreen.main.bounds.size.height * UIScreen.main.scale`                                                                                                                                                                                     | data analysis needs                                                                                   |
| screen_width      | int       | The absolute width of the available display size in pixels.       | generated from`UIScreen.main.bounds.size.width * UIScreen.main.scale`                                                                                                                                                                                      | data analysis needs                                                                                   |
| zone_offset       | int       | the device raw offset from GMT in milliseconds.                   | generated from`TimeZone.current.secondsFromGMT()*1000`                                                                                                                                                                                                     | data analysis needs                                                                                   |
| locale            | String    | the default locale(language, country and variant) for this device | generated from `Locale.current`                                                                                                                                                                                                                            | data analysis needs                                                                                   |
| system_language   | String    | the device language code                                          | generated from `Locale.current.languageCode`<br>default is: "UNKNOWN"                                                                                                                                                                                      | data analysis needs                                                                                   |
| country_code      | String    | country/region code for this device                               | generated from `Locale.current.regionCode`<br>default is: "UNKNOWN"                                                                                                                                                                                        | data analysis needs                                                                                   |
| sdk_version       | String    | clickstream sdk version                                           | generated from`PackageInfo.version`                                                                                                                                                                                                                        | data analysis needs                                                                                   |
| sdk_name          | String    | clickstream sdk name                                              | this will always be `aws-solution-clickstream-sdk`                                                                                                                                                                                                         | data analysis needs                                                                                   |
| app_version       | String    | the app version name                                              | generated from `Bundle.main.infoDictionary["CFBundleShortVersionString"] ?? ""`                                                                                                                                                                            | data analysis needs                                                                                   |
| app_package_name  | String    | the app package name                                              | generated from`Bundle.main.infoDictionary["CFBundleIdentifier"] ?? ""`                                                                                                                                                                                     | data analysis needs                                                                                   |
| app_title         | String    | the app's display name                                            | generated from `Bundle.main.infoDictionary["CFBundleName"] ?? ""`                                                                                                                                                                                          | data analysis needs                                                                                   |

### User attributes

| attribute name              | description                                                                                                |
|-----------------------------|------------------------------------------------------------------------------------------------------------|
| _user_id                    | Reserved for user id that is assigned by app                                                               |
| _user_ltv_revenue           | Reserved for user lifetime value                                                                           |
| _user_ltv_currency          | Reserved for user lifetime value currency                                                                  |
| _user_first_touch_timestamp | Added to the user object for all events. The time (in milliseconds) at which the user first opened the app |

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

## Change log

[GitHub change log](https://github.com/awslabs/clickstream-swift/releases)

## Reference link

[Source code](https://github.com/awslabs/clickstream-swift)

[Project issue](https://github.com/awslabs/clickstream-swift/issues)

[API Documentation](https://awslabs.github.io/clickstream-swift/)

[ClickstreamObjc Api Reference](https://awslabs.github.io/clickstream-swift/Classes/ClickstreamObjc.html)