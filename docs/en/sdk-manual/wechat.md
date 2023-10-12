# Clickstream WeChat Miniprogram SDK

## Introduction

Clickstream WeChat Miniprogram SDK can help you easily collect click stream data from WeChat Miniprogram to your AWS environments through the data pipeline provisioned by this solution. This SDK is part of an AWS solution - {{ solution_name }}, which provisions data pipeline to ingest and process event data into AWS services such as S3, Redshift.

The SDK leverages WeChat Mini Program framework and APIs. It provides features that automatically collect common user events and attributes (for example, page view and first open) to accelerate data collection for users.

## Usage Guidance

### Initialize the SDK

1.Download the `clickstream-wechat.min.js` from the assets in [GitHub Release](https://github.com/awslabs/clickstream-wechat/releases) page then copy it into your project.

2.The SDK should be initialized with necessary configurations before it can work with Clickstream Analytics solution. Take TypeScript mini program project for example, add following code snippet in the *app.ts* file **BEFORE** default `App()` method and fill in `appId` and `endpoint` values, which can be got from Clickstream web console after registering the app to a Clickstream Analytics data pipeline.

```typescript
import { ClickstreamAnalytics } from './clickstream-wechat';

ClickstreamAnalytics.init({
    appId: "your appId",
    endpoint: "https://example.com/collect"
});
```

In addition to the required configuration `appId` and `endpoint`, there are optional configuration properties used for customizing the SDK.

| Property Name           | Required | Default Value        | Description                                                  |
| ----------------------- | :------: |----------------------| ------------------------------------------------------------ |
| appId                   |   yes    | -                    | appId of the project in Clickstream Analytics control plane  |
| endpoint                |   yes    | -                    | the ingestion server endpoint                                |
| sendMode                |    no    | *SendMode.Immediate* | options: *SendMode.Immediate*, *SendMode.Batch*              |
| sendEventsInterval      |    no    | 5000                 | interval (in milliseconds) of sending events, only works for batch send mode |
| autoTrackAppStart       |    no    | true                 | whether auto record app view event                           |
| autoTrackAppEnd         |    no    | true                 | whether auto record app hide event                           |
| autoTrackPageShow       |    no    | true                 | whether auto record page view event                          |
| autoTrackUserEngagement |    no    | true                 | whether auto record user engagement                          |
| autoTrackMPShare        |    no    | false                | whether auto record when user shares mini program            |
| autoTrackMPFavorite     |    no    | false                | whether auto record when user adds mini program to favorites |
| debug                   |    no    | false                | whether print out logs in the console                        |
| authCookie              |    no    | -                    | auth cookie for AWS application load balancer auth           |
| sessionTimeoutDuration  |    no    | 1800000              | session timeout duration in millisecond                      |

The SDK configurations can be updated after initialization by calling `configure()` method

```typescript
import { ClickstreamAnalytics, SendMode } from './clickstream-wechat';

ClickstreamAnalytics.configure({
  appId: "your appId",
  endpoint: "https://example.com/collect",
  sendMode: SendMode.Batch,
  debug: true,
  authCookie: 'auth cookie',
  autoTrackPageShow: false
});
```

### Use the SDK

#### Add User Info

```typescript
// add or update user attributes
ClickstreamAnalytics.setUserAttributes({
  name:"carl",
  age: 22
});

// when user login
ClickstreamAnalytics.setUserId("UserId");

// when user logout
ClickstreamAnalytics.setUserId(null);
```

Current login user's attributes will be cached in wxStorage.

#### Record Event

You can call `ClickstreamAnalytics.record()` method to record custom event. The property `name` is required, while the property `attributes` and `items` are optional. `attributes` property is an object, `items` property is an array list of `item` type object. For logging more attributes in an item, please refer to [item attributes](#item-attributes).

Custom event record samples:

```typescript
ClickstreamAnalytics.record({ name: 'albumVisit' });

ClickstreamAnalytics.record({
  name: 'buttonClick',
  attributes: { buttonName: 'confirm', itemNo: 12345, inStock: true },
  items: [
    {
      id: 'p_123',
      name: 'item_name',
      price: 168.99
    }
  ]
});
```

#### Debug events

You can follow the steps below to view the event raw json and debug your events.

1. Use `ClickstreamAnalytics.configure()` api to set *debug* to `true`, which will enable the SDK debug mode.
2. Integrate the SDK and launch your WeChat mini program on device or [Weixin DevTools](https://developers.weixin.qq.com/miniprogram/en/dev/devtools/devtools.html).
3. In the Console tab, you can find the json content of all the events recorded by the SDK.

## Data format definition

### Data types

Clickstream WeChat Miniprogram SDK supports following data types:

| Data type | Range                       | Sample                 |
|-----------|-----------------------------|------------------------|
| number    | 5e-324~1.79e+308            | 12, 26854775808, 3.14  |
| boolean   | true、false                  | true                   |
| string    | max support 1024 characters | "clickstream"          |

### Naming rules

1. The event and attribute names cannot start with a number, and should only consist of alphanumeric characters and underscores. If the event name is invalid, the event won't be sent. If the name of any attribute is invalid, the event will be sent excluding the invalid attribute. In both cases, the SDK will record a `_clickstream_error` event.

2. Do NOT use `_` as prefix of event or attribute name, those names are reserved for Clickstream Analytics preset events and attributes.

3. The event and attribute names are case-sensitive, e.g. the event `Add_to_cart` and `add_to_cart` are recognized as two different events.

### Event and attribute limitation

In order to improve the efficiency of querying and analysis, we apply limits to event data as follows:

| Name                               | Suggestion       | Hard Limit           | Strategy                          | Error Code |
| ---------------------------------- | ---------------- |----------------------|-----------------------------------|------------|
| EVENT_NAME_INVALID                 | --               | --                   | record `_clickstream_error` event | 1001       |
| EVENT_NAME_LENGTH_EXCEED           | < 25 characters  | 50 characters        | discard, record error event       | 1002       |
| ATTRIBUTE_NAME_LENGTH_EXCEED       | < 25 characters  | 50 characters        | discard, log and record error     | 2001       |
| ATTRIBUTE_NAME_INVALID             | --               | --                   | record `_clickstream_error`event  | 2002       |
| ATTRIBUTE_VALUE_LENGTH_EXCEED      | < 100 characters | 1024 characters      | discard, log and record error     | 2003       |
| ATTRIBUTE_SIZE_EXCEED              | < 50 attributes  | 500 event attributes | discard, log and record error     | 2004       |
| USER_ATTRIBUTE_SIZE_EXCEED         | < 25 attributes  | 100 user attributes  | discard, log and record error     | 3001       |
| USER_ATTRIBUTE_NAME_LENGTH_EXCEED  | < 25 characters  | 50 characters        | discard, log and record error     | 3002       |
| USER_ATTRIBUTE_NAME_INVALID        | --               | --                   | record `_clickstream_error` event | 3003       |
| USER_ATTRIBUTE_VALUE_LENGTH_EXCEED | < 50 characters  | 256 characters       | discard, log and record error     | 3004       |
| ITEM_SIZE_EXCEED                   | < 50 items       | 100 items            | discard, log and record error     | 4001       |
| ITEM_VALUE_LENGTH_EXCEED           | < 100 characters | 256 characters       | discard, log and record error     | 4002       |

!!! info "Important"

    - The character limits are the same for single-width character languages (e.g., English) and double-width character languages (e.g., Chinese).
    - The limit of attribute number per event includes common attributes and preset attributes.
    - In case one attribute is added to the event record more than once, the SDK will use the last value.

## Preset events

### Automatically collected events

| Event Name         | Trigger                                                                                                                                                                                                                                                                                                                   | Event Attributes                                             | Description                                                  |
|--------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------ | ------------------------------------------------------------ |
| _session_start     | first launch WeChat mini program or re-open the mini program when the user is not using it for more than 30 minutes                                                                                                                                                                                                       | 1. *_session_id* <br>2. *_session_start_timestamp*<br>3. *_session_number*<br />4. *_session_duration* | *_session_id* is generated from `uniqueId` and startTime     |
| _screen_view       | when a screen transition occurs and any of the following criteria are met:<br />* No screen was previously set<br />* The new screen name differs from the previous screen name<br />* The new screen-class name differs from the previous screen-class name<br />* The new screen id differs from the previous screen id | 1. *_screen_name*<br>2. *_screen_id*<br>3. *_previous_screen_name*<br>4. *_previous_screen_id*<br>5. *_engagement_time_msec* |                                                              |
| _first_open        | the first time user launches the WeChat mini program                                                                                                                                                                                                                                                                      |                                                              | only record once                                             |
| _app_start         | every time the mini program goes to visible                                                                                                                                                                                                                                                                               | 1. *_is_first_time*                                          |                                                              |
| _app_end           | every time the mini program goes to invisible                                                                                                                                                                                                                                                                             |                                                              |                                                              |
| _user_engagement   | when the mini program user leaves current page or closes/hides app                                                                                                                                                                                                                                                        | 1. *_engagement_time_msec*<br>                               | calculate user engagement duration in mini program page level |
| _profile_set       | when `addUserAttributes()` or `setUserId()` API is invoked                                                                                                                                                                                                                                                                |                                                              |                                                              |
| _mp_share          | when user shares the mini program to others                                                                                                                                                                                                                                                                               |                                                              |                                                              |
| _mp_favorite       | when user adds the mini program to favorites                                                                                                                                                                                                                                                                              |                                                              |                                                              |
| _clickstream_error | when event_name is invalid or attribute name/value is invalid                                                                                                                                                                                                                                                             | 1. *_error_code* <br/>2. _*error_message*                    |                                                              |

### Session definition

In Clickstream WeChat Miniprogram SDK, we do not set duration max limit for a session. If the user opens the mini program within a certain time period after they quit the mini program, we still consider it being in the same session.

1. **_session_start**: When the mini program is launched for the first time, or the mini program is open to the foreground and the time between the last exit exceeds `session_time_out` period.

1. **_session_duration**: We calculate the `_session_duration` based on the current event creation timestamp and the session's `_session_start_timestamp`, this attribute will be added in every event during the session.

1. **session_time_out**: 30 minutes by default, which can be customized via the configuration API.

1. **_session_number**: The total number of distinct sessions (by session id), this attribute will be added in every event's attribute object.

### User engagement definition

In Clickstream WeChat Miniprogram SDK, we define the `_user_engagement` as the mini program page remains in focus for more than one second. `_engagement_time_msec` is calculated against each page, the SDK will calculate the engagement duration starting from a page being opened until the page is hidden, closed or redirected to other pages.

## Event attributes

### Common Attributes

| Attribute name     | Sample                                 | Description                                                  | How to generate                                              |
| ------------------ | -------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| app_id             | "appId"                                | Clickstream appId, configured in the control plane           | SDK user should provide it by calling ClickstreamAnalytics `init()` or `configure()` method. |
| unique_id          | "c84ad28d-16a8-4af4-a331-f34cdc7a7a18" | the unique ID to identify mini program user, this can be used for associating behaviors while logged in and not logged in | SDK user can set this attribute later, e.g. using WeChat *openId* |
| device_id          | "a843d34c-15a8-2af4-a332-b34cdc4a7a12" | uuid()                                                       | generated when the mini program is first opened, then the *device_id* will be stored in the wxStorage and won't be modified. |
| event_type         | "_session_start"                       | event name                                                   | set by user or SDK.                                          |
| event_id           | "460daa08-0717-4385-8f2e-acb5bd019ee7" | the unique id for an event                                   | generated from `uuid()` when the event was created.          |
| timestamp          | 1667877566697                          | event creation timestamp                                     | generated from `new Date().getTime()` when the event was created |
| platform           | "WeChatMP"                             | the platform name                                            | for WeChat mini program it's always "WeChatMP"               |
| os_name            | "iOS"                                  | the device OS name                                           | got from `wx.getSystemInfoSync()` API                        |
| os_version         | "iOS 12.0.1"                           | the device OS version                                        | got from `wx.getSystemInfoSync()` API                        |
| wechat_version     | "8.0.5"                                | the WeChat version                                           | got from `wx.getSystemInfoSync()` API                        |
| wechat_sdk_version | "3.0.0"                                | the WeChat SDK version                                       | got from `wx.getSystemInfoSync()` API                        |
| brand              | Google Inc.                            | the brand of the device                                      | got from `wx.getSystemInfoSync()` API                        |
| model              | "iPhone 6/7/8"                         | the model of the device                                      | got from `wx.getSystemInfoSync()` API                        |
| system_language    | "zh"                                   | the device language code                                     | got from `wx.getSystemInfoSync()` API                        |
| screen_height      | 667                                    | the height pixel of the device screen                        | got from `wx.getSystemInfoSync()` API                        |
| screen_width       | 375                                    | the width pixel of the device screen                         | got from `wx.getSystemInfoSync()` API                        |
| zone_offset        | 28800000                               | the device raw offset from GMT in milliseconds               | `-currentDate.getTimezoneOffset() * 60 * 1000`               |
| network_type       | "wifi"                                 | the network type of the device                               | got from `wx.getNetworkType()` API                           |
| sdk_version        | "0.2.0"                                | Clickstream SDK version                                      | get the version in *package.json*                            |
| sdk_name           | "aws-solution-clickstream-sdk"         | Clickstream sdk name                                         | always be "aws-solution-clickstream-sdk"                     |
| app_package_name   | "wxbd614036ba3d1f05"                   | WeChat mini program Id                                       | got from `wx.getAccountInfoSync()` API                       |
| app_version        | "1.0.1"                                | WeChat mini program version                                  | got from `wx.getAccountInfoSync()` API                       |

### Reserved Attributes

**User attributes**

| Attribute Name              | Required | Description                  |
|-----------------------------|:--------:| ---------------------------- |
| _user_id                    |   yes    | user id                      |
| _user_name                  |   yes    | user name                    |
| _user_first_touch_timestamp |   yes    | when user first used the app |

**Reserved attributes**

| Attribute Name           | Required | Description                                                           |
|--------------------------|:--------:|-----------------------------------------------------------------------|
| _error_code              |    no    | error code, reserved for _clickstream_error event                     |
| _error_message           |    no    | error reason, reserved for _clickstream_error event                   |
| _session_id              |   yes    | session ID                                                            |
| _session_start_timestamp |   yes    | session start time                                                    |
| _session_duration        |   yes    | session duration                                                      |
| _session_number          |   yes    | calculated by device, starting from 1.                                |
| _screen_name             |    no    | current page title                                                    |
| _screen_id               |    no    | current page id                                                       |
| _screen_route            |    no    | current page route                                                    |
| _previous_screen_name    |    no    | last viewed page title                                                |
| _previous_screen_id      |    no    | last viewed page id                                                    |
| _previous_screen_route   |    no    | last viewed page route                                                |
| _engagement_time_msec    |    no    | user engagement duration on the current page                          |
| _is_first_time           |    no    | `true` for the first `_app_start` event after the mini program starts |

### Item attributes

| Attribute name | Data Type        | Required | Description                   |
|----------------|------------------|----------|-------------------------------|
| id             | string           | no       | The id of the item            |
| name           | string           | no       | The name of the item          |
| brand          | string           | no       | The brand of the item         |
| price          | string \| number | no    | The price of the item         |
| quantity       | number           | no       | The quantity of the item      |
| creative_name  | string           | no       | The creative name of the item |
| creative_slot  | string           | no       | The creative slot of the item |
| location_id    | string           | no       | The location id of the item   |
| category       | string           | no       | The category of the item      |
| category2      | string           | no       | The category2 of the item     |
| category3      | string           | no       | The category3 of the item     |
| category4      | string           | no       | The category4 of the item     |
| category5      | string           | no       | The category5 of the item     |

### Sample event structure

```json
{
  "app_id": "appId",
  "unique_id": "c84ad28d-16a8-4af4-a331-f34cdc7a7a18",
  "device_id": "be4b3f1e-b2a8-4b7b-9055-4257e3e313c8",
  "event_type": "_screen_view",
  "event_id": "460daa08-0717-4385-8f2e-acb5bd019ee7",
  "timestamp": 1667877566697,
  "platform": "WeChatMP",
  "os_name": "iOS",
  "os_version": "iOS 12.0.1",
  "wechat_version": "8.0.5",
  "wechat_sdk_version": "3.0.0",
  "brand": "devtools",
  "model": "iPhone 6/7/8",
  "system_language": "en",
  "screen_height": 667,
  "screen_width": 375,
  "zone_offset": 28800000,
  "network_type": "wifi",
  "sdk_version": "0.2.0",
  "sdk_name": "aws-solution-clickstream-sdk",
  "app_version": "1.0.1",
  "app_package_name": "wxbd614036ba3d1f05",
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
    "_session_id":"dc7a7a18-20221108-031926703",
    "_session_start_timestamp": 1667877566703,
    "_session_duration": 391809,
    "_session_number": 1,
    "_previous_screen_id": "pages/category/index",
    "_screen_id": "pages/items/11223/detail",
    "_engagement_time_msec": 30000
  }
}
```

## Change log

[GitHub Change log](https://github.com/awslabs/clickstream-wechat/releases)

## Reference link

[Source code](https://github.com/awslabs/clickstream-wechat)

[Project issue](https://github.com/awslabs/clickstream-wechat/issues)
