# Clickstream Flutter SDK

## Introduction

Clickstream Flutter SDK can help you easily collect in-app click stream data from mobile devices to your AWS
environments through the data pipeline provisioned by this solution.

The SDK is relies on the [Clickstream Android SDK](./android.md) and [Clickstream Swift SDK](./swift.md). Therefore,
flutter SDK also supports automatically collect common user events and attributes (e.g., session start, first open). In
addition, we've added easy-to-use APIs to simplify data collection in Flutter apps.

### Platform Support

**Android**: 4.1 (API level 16) and later

**iOS**: 13 and later

## Integrate the SDK

### 1. Include SDK

```bash
flutter pub add clickstream_analytics
```

After complete, rebuild your Flutter application.

```bash
flutter run
```

### 2. Initialize the SDK

Copy your configuration code from your clickstream solution web console, the configuration code should look like as
follows. You can also manually add this code snippet and replace the values of appId and endpoint after you registered
app to a data pipeline in the Clickstream Analytics solution console.

```dart
import 'package:clickstream_analytics/clickstream_analytics.dart';

final analytics = ClickstreamAnalytics();
analytics.init(
  appId: "your appId",
  endpoint: "https://example.com/collect"
);
```

!!! info "Important"

    - Your `appId` and `endpoint` are already set up in it.
    - We only need to initialize the SDK once after the application starts. It is recommended to do it in the main function of your App.
    - We can use `bool result = await analytics.init()` to get the boolean value of the initialization result.

### 3. Start using

#### Record event

Add the following code where you need to record event.

```dart
import 'package:clickstream_analytics/clickstream_analytics.dart';

final analytics = ClickstreamAnalytics();

// record event with attributes
analytics.record(name: 'button_click', attributes: {
  "event_category": "shoes",
  "currency": "CNY",
  "value": 279.9
});

// record event with name
analytics.record(name: "button_click");
```

#### Add global attribute

1. Add global attributes when initializing the SDK.

    The following example code shows how to add traffic source fields as global attributes when initializing the SDK.

    ```dart
    analytics.init({
      appId: "your appId",
      endpoint: "https://example.com/collect",
      globalAttributes: {
        Attr.TRAFFIC_SOURCE_SOURCE: "amazon",
        Attr.TRAFFIC_SOURCE_MEDIUM: "cpc",
        Attr.TRAFFIC_SOURCE_CAMPAIGN: "summer_promotion",
        Attr.TRAFFIC_SOURCE_CAMPAIGN_ID: "summer_promotion_01",
        Attr.TRAFFIC_SOURCE_TERM: "running_shoes",
        Attr.TRAFFIC_SOURCE_CONTENT: "banner_ad_1",
        Attr.TRAFFIC_SOURCE_CLID: "amazon_ad_123",
        Attr.TRAFFIC_SOURCE_CLID_PLATFORM: "amazon_ads",
        Attr.APP_INSTALL_CHANNEL: "amazon_store"
      }
    });
    ```

2. Add global attributes after initializing the SDK.
    ```dart
    analytics.addGlobalAttributes({
      Attr.TRAFFIC_SOURCE_MEDIUM: "Search engine",
      "level": 10
    });
    ```

It is recommended to set global attributes when initializing the SDK, global attributes will be included in all events
that occur after it is set.

#### Delete global attribute

```
analytics.deleteGlobalAttributes(["level"]);
```

#### Login and logout

```dart
// when user login success.
analytics.setUserId("userId");

// when user logout
analytics.setUserId(null);
```

#### Add user attribute

```dart
analytics.setUserAttributes({
  "userName":"carl",
  "userAge": 22
});
```

Current logged-in user's attributes will be cached in disk, so the next time app open you don't need to set all user
attributes again, of course you can use the same API `analytics.setUserAttributes()` to update the current
user's attribute when it changes.

!!! info "Important"

    If your application is already published and most users have already logged in, please manually set the user attributes once when integrate the Clickstream SDK for the first time to ensure that subsequent events contains user attributes.

#### Record event with items

You can add the following code to log an event with an item, and you can add custom item attribute in the `attributes`
Map. In addition to the preset attributes, an item can add up to 10 custom attributes.

```dart
var itemBook = ClickstreamItem(
    id: "123",
    name: "Nature",
    category: "book",
    price: 99,
    attributes: {
      "book_publisher": "Nature Research"
    }
);

analytics.record(
    name: "view_item", 
    attributes: {
        Attr.VALUE: 99,
        Attr.CURRENCY: "USD"
        "event_category": "recommended"
    }, 
    items: [itemBook]
);
```

For logging more attribute in an item, please refer to [item attributes](android.md#item-attributes).

!!! warning "Important"

    Only pipelines from version 1.1+ can handle items with custom attribute.
    
    item id is required attribute, if not set the item will be discarded.

#### Record Screen View events manually

By default, SDK will automatically track the preset `_screen_view` event when Android Activity triggers `onResume` or
iOS ViewController triggers `viewDidAppear`.

You can also manually record screen view events whether automatic screen view tracking is enabled, add the following
code to record a screen view event with two attributes.

* `screenName` Required. Your screen's name.
* `screenUniqueId` Optional. Set the id of your Widget. If you do not set, the SDK will set a default value based on the
  hashcode of the current Activity or ViewController.

```dart
analytics.recordScreenView(
  screenName: 'Main',
  screenUniqueId: '123adf',
  attributes: { ... }
);
```

#### Other configurations

In addition to the required `appId` and `endpoint`, you can configure other information to get more customized usage:

```dart
final analytics = ClickstreamAnalytics();
analytics.init(
  appId: "your appId",
  endpoint: "https://example.com/collect",
  isLogEvents: false,
  isCompressEvents: false,
  sendEventsInterval: 10000,
  isTrackScreenViewEvents: true,
  isTrackUserEngagementEvents: true,
  isTrackAppExceptionEvents: false,
  authCookie: "your auth cookie",
  sessionTimeoutDuration: 1800000,
  globalAttributes: {
    "_traffic_source_medium": "Search engine",
  }
);
```

Here is an explanation of each option:

| Name                        | Required | Default value | Description                                                                                  |
|-----------------------------|----------|---------------|----------------------------------------------------------------------------------------------|
| appId                       | true     | --            | the app id of your application in control plane                                              |
| endpoint                    | true     | --            | the endpoint path you will upload the event to Clickstream ingestion server                  |
| isLogEvents                 | false    | false         | whether to print out event json in console for debugging events, [Learn more](#debug-events) |
| isCompressEvents            | false    | true          | whether to compress event content by gzip when uploading events                              |
| sendEventsInterval          | false    | 10000         | event sending interval in milliseconds                                                       |
| isTrackScreenViewEvents     | false    | true          | whether auto record screen view events in app                                                |
| isTrackUserEngagementEvents | false    | true          | whether auto record user engagement events in app                                            |
| isTrackAppExceptionEvents   | false    | false         | whether auto track exception event in app                                                    |
| authCookie                  | false    | --            | your auth cookie for AWS application load balancer auth cookie                               |
| sessionTimeoutDuration      | false    | 1800000       | the duration for session timeout in milliseconds                                             |
| globalAttributes            | false    | --            | the global attributes when initializing the SDK                                              |

#### Configuration update

You can update the default configuration after initializing the SDK, below are the additional configuration options you
can customize.

```dart
final analytics = ClickstreamAnalytics();
analytics.updateConfigure(
    appId: "your appId",
    endpoint: "https://example.com/collect",
    isLogEvents: true,
    isCompressEvents: false,
    isTrackScreenViewEvents: false
    isTrackUserEngagementEvents: false,
    isTrackAppExceptionEvents: false,
    authCookie: "test cookie");
```

#### Send event immediately

```dart
final analytics = ClickstreamAnalytics();
analytics.flushEvents();
```

#### Disable SDK

You can disable the SDK in the scenario you need. After disabling the SDK, the SDK will not handle the logging and
sending of any events. Of course, you can enable the SDK when you need to continue logging events.

```dart
final analytics = ClickstreamAnalytics();

// disable SDK
analytics.disable();

// enable SDK
analytics.enable();
```

#### Debug events

You can follow the steps below to view the event raw JSON and debug your events.

1. Using `analytics.updateConfigure()` API and set the `isLogEvents` attributes with true in debug mode, for example:
    ```dart
    // log the event in debug mode.
    analytics.updateConfigure(isLogEvents: true);
    ```

2. Integrate the SDK and launch your app.
    1. For Android application logs, we can see the logs directly in the terminal window. You can also use filters in
       the Android Studio **Logcat** window to view logs.
    2. For iOS application logs, we should launch it via Xcode and open the log panel to see it.

3. Input `EventRecorder` to the filter, and you will see the JSON content of all events recorded by Clickstream Flutter
   SDK.

## Data format definition

### Data types

Clickstream Flutter SDK supports the following data types.

| Data type | Range                                        | Example       |
|-----------|----------------------------------------------|---------------|
| int       | -9223372036854775808 ~ 9223372036854775807 	 | 12            |
| double    | 5e-324 ~ 1.79e+308                           | 3.14          |
| bool      | true, false                                  | true          |
| String    | max 1024 characters                          | "Clickstream" |

### Naming rules

1. The event name and attribute name cannot start with a number, and only contain uppercase and lowercase letters,
   numbers, and underscores. In case of an invalid attribute name or user attribute name, it will discard the attribute
   and record error.

2. Do not use `_` as prefix in an event name or attribute name, because the `_` prefix is reserved for the solution.

3. The event name and attribute name are case-sensitive, so `Add_to_cart` and `add_to_cart` will be recognized as two
   different event names.

### Event and attribute limitation

In order to improve the efficiency of querying and analysis, we apply limits to event data as follows:

| Name                                     | Suggestion                 | Hard limit           | Strategy                                                                           | Error code |
|------------------------------------------|----------------------------|----------------------|------------------------------------------------------------------------------------|------------|
| Event name invalid                       | --                         | --                   | discard event, print log and record `_clickstream_error` event                     | 1001       |
| Length of event name                     | under 25 characters        | 50 characters        | discard event, print log and record `_clickstream_error` event                     | 1002       |
| Length of event attribute name           | under 25 characters        | 50 characters        | discard the attribute,  print log and record error in event attribute              | 2001       |
| Attribute name invalid                   | --                         | --                   | discard the attribute,  print log and record error in event attribute              | 2002       |
| Length of event attribute value          | under 100 characters       | 1024 characters      | discard the attribute,  print log and record error in event attribute              | 2003       |
| Event attribute per event                | under 50 attributes        | 500 event attributes | discard the attribute that exceed, print log and record error in event attribute   | 2004       |
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

For Android: Refer to [Android SDK preset events](./android.md#preset-events)

For iOS: Refer to [Swift SDK preset events](./swift.md#preset-events)

## Event attributes

For Android: Refer to [Android SDK event attributes](./android.md#event-attributes)

For iOS: Refer to [Swift SDK event attributes](./swift.md#event-attributes)

## Change log

[GitHub change log](https://github.com/awslabs/clickstream-flutter/releases)

Native SDK version dependencies

| Flutter SDK Version | Android SDK Version | Swift SDK Version |
|---------------------|---------------------|-------------------|
| 0.3.0 ~ 0.4.0       | 0.12.0              | 0.11.0            |
| 0.2.0               | 0.10.0              | 0.9.1             |
| 0.1.0               | 0.9.0               | 0.8.0             |

## Reference link

[Source code](https://github.com/awslabs/clickstream-flutter)

[Project issue](https://github.com/awslabs/clickstream-flutter/issues)
