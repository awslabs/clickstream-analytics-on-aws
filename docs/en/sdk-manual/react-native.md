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
    - Make sure you call `ClickstreamAnalytics.init()` as early as possible in your application's life-cycle. And make sure the SDK is initialized when calling other APIs.
    - We can use `const result = await ClickstreamAnalytics.init()` to get the boolean value of the initialization result.

### 3. Start using

#### Record event

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

#### Add global attribute

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

#### Delete global attribute

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

#### Add user attribute

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.setUserAttributes({
  userName: "carl",
  userAge: 22
});
```

Current logged-in user's attributes will be cached in disk, so the next time app open you don't need to set all user
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

#### Record Screen Views for React Navigation
Here's an [example](https://github.com/aws-samples/clickstream-sdk-samples/pull/25/files#diff-96a74db413b2f02988e5537fdbdf4f307334e8f5ef3a9999df7de3c6785af75bR344-R397) of globally logging React Native screen view events when using React Navigation 6.x

For other version of React Navigation, you can refer to official documentation: [Screen tracking for analytics](https://reactnavigation.org/docs/screen-tracking/).

#### Send event immediately

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-react-native';

ClickstreamAnalytics.flushEvents();
```

#### Other configurations

In addition to the required `appId` and `endpoint`, you can configure other information to get more customized usage
when initializing the SDK:

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
  isTrackScreenViewEvents: false,
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
Refer to [Web SDK Data format definition](./web.md#data-format-definition)

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

## Sample project
Sample [React Native Project](https://github.com/aws-samples/clickstream-sdk-samples/tree/main/react-native) for SDK integration.

## Reference link

[Source code](https://github.com/awslabs/clickstream-react-native)

[Project issue](https://github.com/awslabs/clickstream-react-native/issues)
