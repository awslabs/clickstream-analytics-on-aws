# Clickstream React Native SDK

## Introduction

Clickstream React Native SDK can help you easily collect in-app click stream data from mobile devices to your AWS
environments through the data pipeline provisioned by this solution.

The SDK is relies on the [Clickstream Android SDK](./android.md) and [Clickstream Swift SDK](./swift.md). Therefore,
React Native SDK also supports automatically collect common user events and attributes (e.g., session start, first open)
. In addition, we've added easy-to-use APIs to simplify data collection in React Native apps.

### Platform Support

**Android**: 4.1 (API level 16) and later

**iOS**: 13 and later

## Integrate the SDK

### 1. Include SDK

```bash
npm install @aws/clickstream-react-native
```

After complete, you need to install the pod dependencies for iOS:

```bash
cd ios && pod install
```

### 2. Initialize the SDK

Copy your configuration code from your clickstream solution web console, we recommended you add the code to your app's
entry point like `index.js`, the configuration code should look like as follows. You can also manually add this code
snippet and replace the values of appId and endpoint after you registered app to a data pipeline in the Clickstream
Analytics solution web console.

```javascript title="index.js"

import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.init({
    appId: 'your appId',
    endpoint: 'https://example.com/collect',
});
```

!!! info "Important"

    - Your `appId` and `endpoint` are already set up in it. We only need to initialize the SDK once after the application starts. 
    - Make sure you call `ClickstreamAnalytics.init` as early as possible in your application’s life-cycle. And make sure the SDK is initialized when calling other APIs.
    - We can use `const result = await ClickstreamAnalytics.init()` to get the boolean value of the initialization result.

### 3. Start using

#### Record events

Add the following code where you need to record events.

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

// record event with attributes
ClickstreamAnalytics.record({
  name: 'button_click',
  attributes: {
    event_category: 'shoes',
    currency: 'CNY',
    value: 279.9,
  },
});

// record event with name
ClickstreamAnalytics.record({name: 'button_click'});
```

#### Add global attributes

1. Add global attributes when initializing the SDK
   ```typescript
   ClickstreamAnalytics.init({
      appId: "your appId",
      endpoint: "https://example.com/collect",
      globalAttributes:{
        _traffic_source_medium: "Search engine",
        _traffic_source_name: "Summer promotion",
      }
   });
   ```

2. Add global attributes after initializing the SDK
   ``` typescript
   ClickstreamAnalytics.setGlobalAttributes({
     _traffic_source_medium: "Search engine",
     level: 10,
   });
   ```

It is recommended to set global attributes when initializing the SDK, global attributes will be included in all events
that occur after it is set.

#### Delete global attributes

``` typescript
ClickstreamAnalytics.deleteGlobalAttributes(['level','_traffic_source_medium']);
```

#### Login and logout

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

// when user login success.
ClickstreamAnalytics.setUserId("userId");

// when user logout
ClickstreamAnalytics.setUserId(null);
```

#### Add user attributes

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.setUserAttributes({
  userName: "carl",
  userAge: 22
});
```

Current login user's attributes will be cached in disk, so the next time app open you don't need to set all user
attributes again, of course you can use the same API `ClickstreamAnalytics.setUserAttributes()` to update the current
user's attribute when it changes.

!!! info "Important"

    If your application is already published and most users have already logged in, please manually set the user attributes once when integrate the Clickstream SDK for the first time to ensure that subsequent events contains user attributes.

#### Record event with items

You can add the following code to log an event with an item.

```typescript
import { ClickstreamAnalytics, Item } from '@aws/clickstream-react-native';

const itemBook: Item = {
  id: '123',
  name: 'Nature',
  category: 'book',
  price: 99,
  book_publisher: "Nature Research",
};
ClickstreamAnalytics.record({
  name: 'view_item',
  attributes: {
    currency: 'USD',
    event_category: 'recommended',
  },
  items: [itemBook],
});
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

* `SCREEN_NAME` Required. Your screen's name.
* `SCREEN_UNIQUE_ID` Optional. Set the id of your component. If you do not set, the SDK will set a default value based
  on the hashcode of the current native Activity or native ViewController.

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.record({
  name: ClickstreamAnalytics.Event.SCREEN_VIEW,
  attributes: {
    [ClickstreamAnalytics.Attr.SCREEN_NAME]: 'HomeComponet',
    [ClickstreamAnalytics.Attr.SCREEN_UNIQUE_ID]: '123adf',
  },
});
```

#### Send event immediately

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.flushEvents();
```

#### Other configurations

In addition to the required `appId` and `endpoint`, you can configure other information to get more customized usage
when initialing the SDK:

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.init({
  appId: 'your appId',
  endpoint: 'https://example.com/collect',
  isLogEvents: true,
  isCompressEvents: true,
  isTrackScreenViewEvents: false,
  isTrackUserEngagementEvents: true,
  isTrackAppExceptionEvents: true,
  sendEventsInterval: 15000,
  sessionTimeoutDuration: 1800000,
  authCookie: 'your auth cookie',
  globalAttributes: {
    _traffic_source_medium: 'Search engine',
  },
});
```

Here is an explanation of each option:

| Name                        | Required | Default value | Description                                                                                  |
|-----------------------------|----------|---------------|----------------------------------------------------------------------------------------------|
| appId                       | true     | --            | the app id of your project in solution web control                                           |
| endpoint                    | true     | --            | the endpoint path you will upload the event to Clickstream ingestion server                  |
| isLogEvents                 | false    | false         | whether to print out event json in console for debugging events, [Learn more](#debug-events) |
| isCompressEvents            | false    | true          | whether to compress event content by gzip when uploading events                              |
| isTrackScreenViewEvents     | false    | true          | whether auto record screen view events in app                                                |
| isTrackUserEngagementEvents | false    | true          | whether auto record user engagement events in app                                            |
| isTrackAppExceptionEvents   | false    | false         | whether auto track exception events in app                                                   |
| sendEventsInterval          | false    | 10000         | event sending interval in milliseconds                                                       |
| sessionTimeoutDuration      | false    | 1800000       | the duration for session timeout in milliseconds                                             |
| authCookie                  | false    | --            | your auth cookie for AWS application load balancer auth cookie                               |
| globalAttributes            | false    | --            | the global attributes when initializing the SDK                                              |

#### Configuration update

You can update the default configuration after initializing the SDK, below are the additional configuration options you
can customize.

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.updateConfigure({
  appId: 'your appId',
  endpoint: 'https://example.com/collect',
  isLogEvents: true,
  authCookie: 'your auth cookie',
  isCompressEvents: true,
  isTrackPageViewEvents: false,
  isTrackUserEngagementEvents: false,
  isTrackAppExceptionEvents: false,
});
```

#### Disable SDK

You can disable the SDK in the scenario you need. After disabling the SDK, the SDK will not handle the logging and
sending of any events. Of course, you can enable the SDK when you need to continue logging events.

```javascript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

// disable SDK
ClickstreamAnalytics.disable();

// enable SDK
ClickstreamAnalytics.enable();
```

#### Debug events

You can follow the steps below to view the events raw JSON and debug your events.

1. Enable the `isLogEvents` configuration when initializing the SDK
   ```javascript
   import { ClickstreamAnalytics } from '@aws/clickstream-react-native';
   
   ClickstreamAnalytics.init({
     appId: 'your appId',
     endpoint: 'https://example.com/collect',
     isLogEvents: true,
   });
   ```

2. After configuring `isLogEvents:true`, when you record an event, you can see the event raw
   json in AndroidStudio Logcat or Xcode debug console by filter `EventRecorder`.

## Data format definition

### Data types

Clickstream React Native SDK supports the following data types.

| Data type | Range                       | Sample                 |
|-----------|-----------------------------|------------------------|
| number    | 5e-324~1.79e+308            | 12, 26854775808, 3.14  |
| boolean   | true, false                 | true                   |
| string    | max support 1024 characters | "clickstream"          |

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

[GitHub change log](https://github.com/awslabs/clickstream-react-native/releases)

React Native SDK version dependencies

| React Native SDK Version | Android SDK Version | Swift SDK Version |
|--------------------------|---------------------|-------------------|
| 0.1.0                    | 0.12.0              | 0.11.0            |

## Reference link

[Source code](https://github.com/awslabs/clickstream-react-native)

[Project issue](https://github.com/awslabs/clickstream-react-native/issues)
