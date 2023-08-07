# Clickstream Web SDK

## Introduction

Clickstream Web SDK can help you easily collect click stream data from browser to your AWS environments through the data pipeline provisioned by this solution.

The SDK is based on the amplify-js SDK core library and developed according to the amplify-js SDK plug-in specification. In addition, the SDK provides features that automatically collect common user events and attributes (for example, screen view, and first open) to accelerate data collection for users.

## Integrate the SDK

### Include SDK

```bash
npm install @aws/clickstream-web
```

### Initialize the SDK

You need to configure the SDK with default information before using it. Copy your configuration code from your clickstream solution control plane, the configuration code should look like as follows. You can also manually add this code snippet and replace the values of appId and endpoint after you registered app to a data pipeline in the Clickstream Analytics solution console.

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.init({
   appId: "your appId",
   endpoint: "https://example.com/collect",
});
```

Your `appId` and `endpoint` are already set up in it.

### Start using

#### Record event

Add the following code where you need to record event.

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.record({ name: 'albumVisit' });
ClickstreamAnalytics.record({
  name: 'buttonClick',
  attributes: { _channel: 'SMS', Successful: true }
});
```

#### Login and logout

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

// when user login success.
ClickstreamAnalytics.setUserId("UserId");

// when user logout
ClickstreamAnalytics.setUserId(null);
```

#### Add user attribute

```typescript
ClickstreamAnalytics.setUserAttributes({
  userName:"carl",
  userAge: 22
});
```

Current login user's attributes will be cached in localStorage, so the next time browser open you don't need to set all user's attribute again, of course you can use the same api `ClickstreamAnalytics.setUserAttributes()` to update the current user's attribute when it changes.

#### Other configurations

In addition to the required `appId` and `endpoint`, you can configure other information to get more customized usage:

```typescript
import { ClickstreamAnalytics, EventMode, PageType } from '@aws/clickstream-web';

ClickstreamAnalytics.configure({
   appId: "your appId",
   endpoint: "https://example.com/collect",
   sendMode: EventMode.Batch,
   sendEventsInterval: 5000,
   isTrackPageViewEvents: true,
   isTrackClickEvents: true,
   isTrackSearchEvents: true,
   isTrackScrollEvents: true,
   pageType: PageType.SPA,
   isLogEvents: false,
   authCookie: "your auth cookie",
   sessionTimeoutDuration: 1800000,
   searchKeyWords: ['product', 'class'],
   domainList: ['example1.com', 'example2.com'],
});
```

Here is an explanation of each property:

- **appId (Required)**: the app id of your project in control plane.
- **endpoint (Required)**: the endpoint path you will upload the event to AWS server.
- **sendMode**: EventMode.Immediate, EventMode.Batch, default is Immediate mode.
- **sendEventsInterval**: event sending interval millisecond, works only bath send mode, the default value is `5000`
- **isTrackPageViewEvents**: whether auto record page view events in browser, default is `true`
- **isTrackClickEvents**: whether auto record link click events in browser, default is `true`
- **isTrackSearchEvents**: whether auto record search result page events in browser, default is `true`
- **isTrackScrollEvents**: whether auto record page scroll events in browser, default is `true`
- **pageType**: the website type, `SPA` for single page application, `multiPageApp` for multiple page application, default is `SPA`. This attribute works only when the attribute `isTrackPageViewEvents`'s value is `true`.
- **isLogEvents**: whether to print out event json for debugging, default is false.
- **authCookie**: your auth cookie for AWS application load balancer auth cookie.
- **sessionTimeoutDuration**: the duration for session timeout millisecond, default is 1800000
- **searchKeyWords**: the customized Keywords for trigger the `_search` event, by default we detect `q`, `s`, `search`, `query` and `keyword` in query parameters.
- **domainList**: if your website cross multiple domain, you can customize the domain list. The `_outbound` attribute of the `_click` event will be true when a link leads to a website that's not a part of your configured domain.

#### Configuration update

You can update the default configuration after initializing the SDK, below are the additional configuration options you can customize.

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.updateConfigure({
  isLogEvents: true,
  authCookie: 'your auth cookie',
  isTrackPageViewEvents: false,
  isTrackClickEvents: false,
  isTrackScrollEvents: false,
  isTrackSearchEvents: false,
});
```

## Data format definition

### Data types

Clickstream Web SDK supports the following data types:

| Data type | range                       | sample                |
|-----------| --------------------------- | --------------------- |
| number    | 5e-324~1.79e+308            | 12, 26854775808, 3.14 |
| boolean   | true、false                  | true                  |
| string    | max support 1024 characters | "clickstream"         |

### Naming rules

1. The event name and attribute name cannot start with a number, and only contains: uppercase and lowercase letters, numbers, underscores, if the event name is invalid, the SDK will record `_clickstream_error` event, if the attribute or user attribute name is invalid, the attribute will discard and also record `_clickstream_error` event.

2. Do not use `_` as prefix to naming event name and attribute name, `_` is the preset from Clickstream Analytics.

3. The event name and attribute name are in case-sensitive, so the event `Add_to_cart` and `add_to_cart` will be recognized as two different event.

### Event and attribute limitation

In order to improve the efficiency of querying and analysis, we apply limits to event data as follows:

In order to improve the efficiency of querying and analysis, we need to limit events as follows:

| Name                            | Suggestion          | Hard limit          | strategy                         | error code |
| ------------------------------- | ------------------- | ------------------- | -------------------------------- | ---------- |
| Event name invalid              | --                  | --                  | record `_clickstream_error`event | 1001       |
| Length of event name            | under 25 character  | 50 character        | discard, record error event      | 1002       |
| Length of event attribute name  | under 25 character  | 50 character        | discard, log and record error    | 2001       |
| Attribute name invalid          | --                  | --                  | record `_clickstream_error`event | 2002       |
| Length of event attribute value | under 100 character | 1024 character      | discard, log and record error    | 2003       |
| Event attribute per event       | under 50 attribute  | 500 evnet attribute | discard, log and record error    | 2004       |
| User attribute number           | under 25 attribute  | 100 user attribute  | discard, log and record error    | 3001       |
| Length of User attribute name   | under 25 character  | 50 character        | discard, log and record error    | 3002       |
| User attribute name invalid     | --                  | --                  | record `_clickstream_error`event | 3003       |
| Length of User attribute value  | under 50 character  | 256 character       | discard, log and record error    | 3004       |

!!! info "Important"

    - The character limits are the same for single-width character languages (e.g., English) and double-width character languages (e.g., Chinese).
    - The limit of event attribute per event include preset attributes.
    - If the attribute or user attribute with the same name is added more than twice, the latest value will apply.

## Preset events and attributes

### Preset events

Automatically collected events:

| Event name         | Triggered                                                                                               | Event Attributes                                                                                                                                                                                                                                                                                                    |
|--------------------|---------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| _session_start     | first visit or the user is more than 30 minutes away from the last exit                                 | 1._session_id <br>2._session_start_timestamp<br>3._session_duration                                                                                                                                                                                                                                                 |
| _page_view         | when new page is open                                                                                   | 1._page_url<br>2._page_referrer                                                                                                                                                                                                                                                                                     |
| _first_open        | the first time user launches an website                                                                 |                                                                                                                                                                                                                                                                                                                     |
| _app_start         | every time the browser goes to visibility                                                               | 1._is_first_time                                                                                                                                                                                                                                                                                                    |
| _user_engagement   | when the webpage is in focus at least one second                                                        | 1._engagement_time_msec<br>                                                                                                                                                                                                                                                                                         |
| _profile_set       | when the `addUserAttributes()` or `setUserId()` api called                                              |                                                                                                                                                                                                                                                                                                                     |
| _scroll            | the first time a user reaches the bottom of each page (i.e., when a 90% vertical depth becomes visible) | 1._engagement_time_msec                                                                                                                                                                                                                                                                                             |
| _search            | each time a user performs a site search, indicated by the presence of a URL query parameter             | 1._search_key (the keyword name)<br>2._search_term (the search content)                                                                                                                                                                                                                                             |
| _click             | each time a user clicks a link that leads away from the current domain (or configured domain list)      | 1._link_classes (the content of `class` in tag `<a>` )<br>2._link_domain (the domain of `herf` in tag `<a>` )<br>3._link_id (the content of `id` in tag `<a>` )<br>4._link_url (the content of `herf` in tag `<a>` )<br>5._outbound (if the domain is not in configured domain list, the attribute value is `true`) |
| _clickstream_error | event_name is invalid or user attribute is invalid                                                      | 1._error_code <br>2._error_value                                                                                                                                                                                                                                                                                    |

#### Session definition

In Clickstream Web SDK, we do not limit the total time of a session, as long as the time between the next entry of the browser and the last exit time is within the allowable timeout period, we consider the current session to be continuous.

**_session_start**: When the website open for the first time, or the browser was open to the foreground and the time between the last exit exceeded `session_time_out` period.

**_session_duration**: We calculate the `_session_duration` by minus the current event create timestamp and the session's `_session_start_timestamp`, this attribute will be added in every event during the session.

**session_time_out**: By default is 30 minutes, which can be customized through the configuration api.

**_session_number**: The total number of session distinct by session id, and `_session_number` will be appeared in every event's attribute object.

#### 4.1.2 User engagement definition

In Clickstream Web SDK, we define the `user_engagement` as the webpage is in focus at least one second.

**when to send**: We send the event when the browser is close, hide or navigate to another  web page in different domain.

**engagement_time_msec**: We count the time from when the web page is visible to when the web page is hidden.

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
  "platform": "Web",
  "make": "Google Inc.",
  "locale": "zh_CN",
  "screen_height": 1080,
  "screen_width": 1920,
  "zone_offset": 28800000,
  "system_language": "zh",
  "country_code": "CN",
  "sdk_version": "0.2.0",
  "sdk_name": "aws-solution-clickstream-sdk",
  "host_name": "https://example.com",
  "app_id": "appId",
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
    "_channel": "SMS",
    "Successful": true,
    "Price": 120.1,
    "ProcessDuration": 791,
    "_session_id":"dc7a7a18-20221108-031926703",
    "_session_start_timestamp": 1667877566703,
    "_session_duration": 391809,
    "_session_number": 1,
    "_page_referrer": "https://example.com/index.html",
    "_page_referrer_title": "index",
    "_page_title": "login page",
    "_page_url": "https://example.com/login.html"
  }
}
```

All user attributes will be stored in `user` object, and all custom attributes are in `attributes` object.

#### Common attribute

| attribute        | describe                                                          | how to generate                                                                                                                                                                                                                                         | use and purpose                                                                                      |
|------------------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| hashCode         | the event object's hash code                                      | calculate by library @aws-crypto/sha256-js                                                                                                                                                                                                              | distinguish different event                                                                          |
| app_id           | clickstream app id                                                | generated when clickstream app create from solution control plane.                                                                                                                                                                                      | identify the events for your apps                                                                    |
| unique_id        | the unique id for user                                            | generate from `uuidV4()` when the sdk first initialization<br> it will be changed after user relogin to another user who never login, and when user relogin to the before user in same browser, the unique_id will reset to the before user's unique_id | the unique for identity different user and associating the behavior of logging in and not logging in |
| device_id        | the unique id for device                                          | generate form `uuidV4()` when the website is first open, then the uuid will stored in localStorage and will never change it                                                                                                                             | distinguish different device                                                                         |
| event_type       | event name                                                        | set by developer or SDK                                                                                                                                                                                                                                 | distinguish different event type                                                                     |
| event_id         | the unique id for event                                           | generate from `uuidV4()` when the event create                                                                                                                                                                                                          | distinguish each event                                                                               |
| timestamp        | event create timestamp                                            | generate from `new Date().getTime()` when event create                                                                                                                                                                                                  | data analysis needs                                                                                  |
| platform         | the platform name                                                 | for browser is always `Web`                                                                                                                                                                                                                             | data analysis needs                                                                                  |
| make             | the browser make                                                  | generate from `window.navigator.product` or `window.navigator.vendor`                                                                                                                                                                                   | data analysis needs                                                                                  |
| screen_height    | the website window height pixel                                   | generate from `window.innerHeight`                                                                                                                                                                                                                      | data analysis needs                                                                                  |
| screen_width     | the website window width pixel                                    | generate from `window.innerWidth`                                                                                                                                                                                                                       | data analysis needs                                                                                  |
| zone_offset      | the device raw offset from GMT in milliseconds.                   | generate from `-currentDate.getTimezoneOffset()*60000`                                                                                                                                                                                                  | data analysis needs                                                                                  |
| locale           | the default locale(language, country and variant) for the browser | generate from `window.navigator.language`                                                                                                                                                                                                               | data analysis needs                                                                                  |
| system_language  | the browser language code                                         | generate from `window.navigator.language`                                                                                                                                                                                                               | data analysis needs                                                                                  |
| country_code     | country/region code for the browser                               | generate from `window.navigator.language`                                                                                                                                                                                                               | data analysis needs                                                                                  |
| sdk_version      | clickstream sdk version                                           | generate from `package.json`                                                                                                                                                                                                                            | data analysis needs                                                                                  |
| sdk_name         | clickstream sdk name                                              | this will always be `aws-solution-clickstream-sdk`                                                                                                                                                                                                      | data analysis needs                                                                                  |
| host_name        | the website hostname                                              | generate from `window.location.hostname`                                                                                                                                                                                                                | data analysis needs                                                                                  |

#### Reserved attributes

**User attributes**

| Attribute name               | Description                                                                                                            |
|------------------------------|------------------------------------------------------------------------------------------------------------------------|
| _user_id                     | Reserved for user id that is assigned by app                                                                           |
| _user_ltv_revenue            | Reserved for user lifetime value                                                                                       |
| _user_ltv_currency           | Reserved for user lifetime value currency                                                                              |
| _user_first_touch_timestamp  | The time (in microseconds) when the user first visited the website, and it is included in every event in `user` object |

**Event attributes**

| Attribute name           | Description                                                                                                               |
|--------------------------|---------------------------------------------------------------------------------------------------------------------------|
| _traffic_source_medium   | Reserved for traffic medium. Use this attribute to store the medium that acquired user when events were logged.           |
| _traffic_source_name     | Reserved for traffic name. Use this attribute to store the marketing campaign that acquired user when events were logged. |
| _traffic_source_source   | Reserved for traffic source. Name of the network source that acquired the user when the event were reported.              |
| _device_vendor_id        | Vendor id of the device.                                                                                                  |
| _device_advertising_id   | Advertising id of the device.                                                                                             |
| _entrances               | Added in `_screen_view` event. The first `_screen_view` event in a session has the value 1, and others 0.                 |
| _session_id              | Added in all events.                                                                                                      |
| _session_start_timestamp | Added in all events.                                                                                                      |
| _session_duration        | Added in all events.                                                                                                      |
| _session_number          | Added in all events. The initial value is 1, and the value is automatically incremented by user device.                   |
| _error_code              | The `_clickstream_error` event's attribute.                                                                               |
| _page_title              | Added in all events.                                                                                                      |
| _page_url                | Added in all events.                                                                                                      |
