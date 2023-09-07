# Clickstream Web SDK

## Introduction

Clickstream Web SDK can help you easily collect click stream data from browser to your AWS environments through the data pipeline provisioned by this solution.

The SDK is based on the amplify-js SDK core library and developed according to the amplify-js SDK plug-in specification. In addition, the SDK provides features that automatically collect common user events and attributes (for example, page view, and first open) to accelerate data collection for users.

## Integrate the SDK

### Initialize the SDK

!!! note ""
    === "Using NPM"
        1.Include the SDK

        ```bash
        npm install @aws/clickstream-web
        ```
    
        2.Initialize the SDK
        
        You need to configure the SDK with default information before using it. Copy your initialize code from your clickstream solution web console, we recommended you add the code to your app's root entry point, for example `index.js/app.tsx` in React or `main.ts` in Vue/Angular, the initialize code should look like as follows.
    
        ```typescript
        import { ClickstreamAnalytics } from '@aws/clickstream-web';
    
        ClickstreamAnalytics.init({
           appId: "your appId",
           endpoint: "https://example.com/collect",
        });
        ```
    
        Your `appId` and `endpoint` are already set up in it, you can also manually add this code snippet and replace the values of appId and endpoint after you registered app to a data pipeline in the Clickstream web console.
    
    === "Using JS File"
        1.Download the `clickstream-web.min.js` from the assets in [GitHub Release](https://github.com/awslabs/clickstream-web/releases) page then copy it into your project.
        
        2.Add the following initial code into your `index.html`.
    
        ```html
        <script src="clickstream-web.min.js"></script>
        <script>
            window.ClickstreamAnalytics.init({
                appId: 'your appId',
                endpoint: 'https://example.com/collect',
            })
        </script>
        ```
    
        You can find the `appId` and `endpoint` in the application detail page of the Clickstream web console. 
        
        To lazy loading the SDK, use the `async` attribute and place the `ClickstreamAnalytics.init()` method after `window.onload` or `DOMContentLoaded`.

### Start using

#### Record event

Add the following code where you need to record event.

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

// record event with attributes
ClickstreamAnalytics.record({
  name: 'button_click',
  attributes: { 
    category: 'shoes', 
    currency: 'CNY',
    value: 279.9,
  }
});

//record event with name
ClickstreamAnalytics.record({ name: 'button_click' });
```
#### Login and logout

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

// when user login success.
ClickstreamAnalytics.setUserId("1234");

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

!!! info "Important"

    If your application is already published and most users have already logged in, please manually set the user attributes once when integrate the Clickstrema SDK for the first time to ensure that subsequent events contains user attributes.

#### Record event with items

You can add the following code to log an event with an item.

```typescript
import { ClickstreamAnalytics, Item } from '@aws/clickstream-web';

const itemBook: Item = {
  id: '123',
  name: 'Nature',
  category: 'book',
  price: 99,
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

For logging more attribute in an item, please refer to [item attributes](#item-attributes).

#### Send event immediate in batch mode

When you are in batch mode, you can still send an event immediately by setting the `isImmediate` attribute to `true`, as the following code.

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.record({
  name: 'button_click',
  isImmediate: true,
});
```

#### Other configurations

In addition to the required `appId` and `endpoint`, you can configure other information to get more customized usage:

```typescript
import { ClickstreamAnalytics, SendMode, PageType } from '@aws/clickstream-web';

ClickstreamAnalytics.init({
   appId: "your appId",
   endpoint: "https://example.com/collect",
   sendMode: SendMode.Batch,
   sendEventsInterval: 5000,
   isTrackPageViewEvents: true,
   isTrackUserEngagementEvents: true,
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

Here is an explanation of each option:

| Name                        | Required | Default value | Description                                                  |
| --------------------------- | -------- | ------------- | ------------------------------------------------------------ |
| appId                       | true     | --            | the app id of your application in control plane              |
| endpoint                    | true     | --            | the endpoint path you will upload the event to Clickstream ingestion server |
| sendMode                    | false    | Immediate     | there are two ways for send events `Immediate` and `Batch`   |
| sendEventsInterval          | false    | 5000          | event sending interval millisecond, works only in `Batch` mode |
| isTrackPageViewEvents       | false    | true          | whether auto record page view events in browser              |
| isTrackUserEngagementEvents | false    | true          | whether auto record user engagement events in browser        |
| isTrackClickEvents          | false    | true          | whether auto record link click events in browser             |
| isTrackSearchEvents         | false    | true          | whether auto record search result page events in browser     |
| isTrackScrollEvents         | false    | true          | whether auto record page scroll events in browser            |
| pageType                    | false    | SPA           | the website type, `SPA` for single page application, `multiPageApp` for multiple page application. This attribute works only when the value of attribute `isTrackPageViewEvents` is `true` |
| isLogEvents                 | false    | false         | whether to print out event json in console for debugging     |
| authCookie                  | false    | --            | your auth cookie for AWS application load balancer auth cookie |
| sessionTimeoutDuration      | false    | 1800000       | the duration for session timeout milliseconds                |
| searchKeyWords              | false    | --            | the customized Keywords for trigger the `_search` event, by default we detect `q`, `s`, `search`, `query` and `keyword` in query parameters |
| domainList                  | false    | --            | if your website cross multiple domain, you can customize the domain list. The `_outbound` attribute of the `_click` event will be true when a link leads to a website that's not a part of your configured domain. |

#### Configuration update

You can update the default configuration after initializing the SDK, below are the additional configuration options you can customize.

```typescript
import { ClickstreamAnalytics } from '@aws/clickstream-web';

ClickstreamAnalytics.updateConfigure({
  isLogEvents: true,
  authCookie: 'your auth cookie',
  isTrackPageViewEvents: false,
  isTrackUserEngagementEvents: false,
  isTrackClickEvents: false,
  isTrackScrollEvents: false,
  isTrackSearchEvents: false,
});
```

#### Debug events

You can follow the steps below to view the event raw json and debug your events.

1. Using `ClickstreamAnalytics.init()` api and set the `isLogEvents` attribute to true in debug mode.
2. Integrate the SDK and launch your web application in a browser, then open the Inspection page and switch to console tab.
3. Input `EventRecorder` to Filter, and you will see the json content of all events recorded by Clickstream Web SDK.

## Data format definition

### Data types

Clickstream Web SDK supports the following data types:

| Data type | Range                       | Sample                 |
|-----------|-----------------------------|------------------------|
| number    | 5e-324~1.79e+308            | 12, 26854775808, 3.14  |
| boolean   | true、false                  | true                   |
| string    | max support 1024 characters | "clickstream"          |

### Naming rules

1. The event name and attribute name cannot start with a number, and only contains: uppercase and lowercase letters, numbers, underscores, if the event name is invalid, the SDK will record `_clickstream_error` event, if the attribute or user attribute name is invalid, the attribute will be discarded and also record `_clickstream_error` event.

2. Do not use `_` as prefix to naming event name and attribute name, `_` is the preset from Clickstream Analytics.

3. The event name and attribute name are in case-sensitive, so the event `Add_to_cart` and `add_to_cart` will be recognized as two different event.

### Event and attribute limitation

In order to improve the efficiency of querying and analysis, we apply limits to event data as follows:

| Name                            | Suggestion           | Hard limit           | Strategy                                                     | Error code |
| ------------------------------- | -------------------- | -------------------- | ------------------------------------------------------------ | ---------- |
| Event name invalid              | --                   | --                   | discard event, print log and record `_clickstream_error` event | 1001       |
| Length of event name            | under 25 characters  | 50 characters        | discard event, print log and record `_clickstream_error` event | 1002       |
| Length of event attribute name  | under 25 characters  | 50 characters        | discard the attribute,  print log and record error in event attribute | 2001       |
| Attribute name invalid          | --                   | --                   | discard the attribute,  print log and record error in event attribute | 2002       |
| Length of event attribute value | under 100 characters | 1024 characters      | discard the attribute,  print log and record error in event attribute | 2003       |
| Event attribute per event       | under 50 attributes  | 500 evnet attributes | discard the attribute that exceed, print log and record error in event attribute | 2004       |
| User attribute number           | under 25 attributes  | 100 user attributes  | discard the attribute that exceed, print log and record `_clickstream_error` event | 3001       |
| Length of User attribute name   | under 25 characters  | 50 characters        | discard the attribute, print log and record `_clickstream_error` event | 3002       |
| User attribute name invalid     | --                   | --                   | discard the attribute, print log and record `_clickstream_error` event | 3003       |
| Length of User attribute value  | under 50 characters  | 256 characters       | discard the attribute, print log and record `_clickstream_error` event | 3004       |
| Item Number in one event        | under 50 items       | 100 items            | discard the item that exceed, print log and record error in event attribute | 4001       |
| Length of item attribute value  | under 100 characters | 256 characters       | discard the item attribute, print log and record error in event attribute | 4002       |



!!! info "Important"

    - The character limits are the same for single-width character languages (e.g., English) and double-width character languages (e.g., Chinese).
    - The limit of event attribute per event include preset attributes.
    - If the attribute or user attribute with the same name is added more than twice, the latest value will apply.
    - All errors that exceed the limit will be recorded `_error_code` and `_error_message` these two attribute in the event attributes.

## Preset events

### Automatically collected events

| Event name         | Triggered                                                    | Event Attributes                                             |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| _first_open        | the first time user launches the site in a browser           |                                                              |
| _session_start     | when a user first visit the site or a user returns to the website after 30 minutes of inactivity period, [Learn more](#session-definition) | 1. _session_id <br>2. _session_start_timestamp               |
| _page_view         | when new page is opens, [Learn more](#page-view-definition)  | 1. _page_referrer<br/>2. _page_referrer_title<br>3. _entrances<br>4. _previous_timestamp<br>5. _engagement_time_msec |
| _user_engagement   | when user navigates away from current webpage and the page is in focus for at least one second, [Learn more](#user-engagement-definition) | 1._engagement_time_msec<br>                                  |
| _app_start         | every time the browser goes to visible                       | 1. _is_first_time(when it is the first `_app_start` event after the application starts, the value is `true`) |
| _app_end           | every time the browser goes to invisible                     |                                                              |
| _profile_set       | when the `addUserAttributes()` or `setUserId()` api called   |                                                              |
| _scroll            | the first time a user reaches the bottom of each page (i.e., when a 90% vertical depth becomes visible) | 1. _engagement_time_msec                                     |
| _search            | each time a user performs a site search, indicated by the presence of a URL query parameter, by default we detect `q`, `s`, `search`, `query` and `keyword` in query parameters | 1. _search_key (the keyword name)<br>2. _search_term (the search content) |
| _click             | each time a user clicks a link that leads away from the current domain (or configured domain list) | 1. _link_classes (the content of `class` in tag `<a>` )<br>2. _link_domain (the domain of `herf` in tag `<a>` )<br>3. _link_id (the content of `id` in tag `<a>` )<br>4. _link_url (the content of `herf` in tag `<a>` )<br>5. _outbound (if the domain is not in configured domain list, the attribute value is `true`) |
| _clickstream_error | event_name is invalid or user attribute is invalid           | 1. _error_code <br>2. _error_message                         |

### Session definition

In Clickstream Web SDK, we do not limit the total time of a session, as long as the time between the next entry of the browser and the last exit time is within the allowable timeout period, we consider the current session to be continuous. 

The `_session_start` event triggered when the website open for the first time, or the browser was open to the foreground and the time between the last exit exceeded `session_time_out` period, and the following are session-related attributes.

1. _session_id: We calculate the session id by concatenating the last 8 characters of uniqueId and the current millisecond, for example: dc7a7a18-20230905-131926703.

2. _session_duration : We calculate the session duration by minus the current event create timestamp and the session's `_session_start_timestamp`, this attribute will be added in every event during the session.

3. _session_number : The auto increment number of session in current browser, the initial value is 1

4. Session timeout duration: By default is 30 minutes, which can be customized through the [configuration](#other-configurations) api.

### Page view definition

In Clickstream Web SDK, we define the `_page_view` as an event that record the user's browsing path of page, when a page transition started, the `_page_view` event will be recorded when meet any of the following conditions:

1. No page was previously set.
2. The new page title differs from the previous page title.
3. The new page url differ from the previous page url.

This event listens for `pushState`, `popState` in history, and `replaceState` of window to judgment the page transition. In order to count page browsing path, we use `_page_referrer`(last page url) and `page_referrer_title` to link the previous page. In addition, there are some other attributes in page view event.

1. _entrances: The first page view event in a session is 1, others is 0.
2. _previous_timestamp: The timestamp of the previous `_page_view` event.
3. _engagement_time_msec: The previous page last engagement milliseconds.

### User engagement definition

In Clickstream Web SDK, we define the `_user_engagement` as an event that records the page browsing time, and we only send this event when user leave the page and the page has focus for at least one second.

We define that users leave the page in the following situations.

1. When the user navigates to another page under the current domain.
2. When user click a link that leads away from the current domain. 
3. When user click another browser tab or minimize the current browser window.
4.  When user close the website tab or close the browser application.

**engagement_time_msec**: We calculate the milliseconds from when a page is visible to when the user leave the page.

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
	"platform": "Web",
	"make": "Google Inc.",
	"locale": "zh_CN",
	"screen_height": 1080,
	"screen_width": 1920,
    "viewport_height": 980,
    "viewport_width": 1520,
	"zone_offset": 28800000,
	"system_language": "zh",
	"country_code": "CN",
	"sdk_version": "0.2.0",
	"sdk_name": "aws-solution-clickstream-sdk",
	"host_name": "https://example.com",
	"app_id": "appId",
	"items": [{
		"id": "123",
		"name": "Nike",
		"category": "shoes",
		"price": 279.9
	}],
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
		"_latest_referrer": "https://amazon.com/s?k=nike",
		"_latest_referrer_host": "amazon.com",
		"_page_title": "index",
		"_page_url": "https://example.com/index.html"
	}
}
```

All user attributes will be stored in `user` object, and all custom attributes are in `attributes` object.

### Common attributes

| Attribute name  | Data type | Description                                                  | How to generate                                              | Usage and purpose                                            |
| --------------- | --------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| hashCode        | string    | the event object's hash code                                 | calculated by library `@aws-crypto/sha256-js`                | distinguish different events                                 |
| app_id          | string    | clickstream app id                                           | generated when clickstream app create from solution web console. | identify the events for your apps                            |
| unique_id       | string    | the unique id for user                                       | generated from `uuidV4()` when the sdk first initialization<br> it will be changed after user re-login to another user who never login, and when user re-login to the before user in same browser, the unique_id will reset to the before user's unique_id | the unique for identity different users and associating the behavior of logging in and not logging in |
| device_id       | string    | the unique id for device                                     | generated from `uuidV4()` when the website is first open, then the uuid will stored in localStorage and will never change it | distinguish different devices                                |
| event_type      | string    | event name                                                   | set by developer or SDK                                      | distinguish different events type                            |
| event_id        | string    | the unique id for event                                      | generated from `uuidV4()` when the event create              | distinguish different events                                 |
| timestamp       | number    | event create timestamp in millisecond                        | generated from `new Date().getTime()` when event create      | data analysis needs                                          |
| platform        | string    | the platform name                                            | for browser is always `Web`                                  | data analysis needs                                          |
| make            | string    | the browser make                                             | generated from `window.navigator.product` or `window.navigator.vendor` | data analysis needs                                          |
| screen_height   | number    | the screen height pixel                                      | generated from `window.screen.height`                        | data analysis needs                                          |
| screen_width    | number    | the screen width pixel                                       | generated from `window.screen.width`                         | data analysis needs                                          |
| viewport_height | number    | the website viewport height pixel                            | generated from `window.innerHeight`                          | data analysis needs                                          |
| viewport_width  | number    | the website viewport width pixel                             | generated from `window.innerWidth`                           | data analysis needs                                          |
| zone_offset     | number    | the device raw offset from GMT in milliseconds.              | generated from `-currentDate.getTimezoneOffset()*60000`      | data analysis needs                                          |
| locale          | string    | the default locale(language, country and variant) for the browser | generated from `window.navigator.language`                   | data analysis needs                                          |
| system_language | string    | the browser language code                                    | generated from `window.navigator.language`                   | data analysis needs                                          |
| country_code    | string    | country/region code for the browser                          | generated from `window.navigator.language`                   | data analysis needs                                          |
| sdk_version     | string    | clickstream sdk version                                      | generated from `package.json`                                | data analysis needs                                          |
| sdk_name        | string    | clickstream sdk name                                         | this will always be `aws-solution-clickstream-sdk`           | data analysis needs                                          |
| host_name       | string    | the website hostname                                         | generated from `window.location.hostname`                    | data analysis needs                                          |

### User attributes

| Attribute name              | Description                                                                                                 |
|-----------------------------|-------------------------------------------------------------------------------------------------------------|
| _user_id                    | Reserved for user id that is assigned by app                                                                |
| _user_ltv_revenue           | Reserved for user lifetime value                                                                            |
| _user_ltv_currency          | Reserved for user lifetime value currency                                                                   |
| _user_first_touch_timestamp | Added to the user object for all events. The time (in millisecond) when the user first visited the website. |

### Event attributes

| Attribute name           | Data type | Auto   track | Description                                                                                                                                                 |
|--------------------------|-----------|--------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| _traffic_source_medium   | string    | false        | Reserved for traffic medium. Use this attribute to store the medium that acquired user when events were logged. Example: Email, Paid search, Search engine. |
| _traffic_source_name     | string    | false        | Reserved for traffic name. Use this attribute to store the marketing campaign that acquired user when events were logged. Example: Summer promotion.        |
| _traffic_source_source   | string    | false        | Reserved for traffic source. Name of the network source that acquired the user when the event were reported. Example: Google, Facebook, Bing, Baidu.        |
| _session_id              | string    | true         | Added in all events.                                                                                                                                        |
| _session_start_timestamp | number    | true         | Added in all events. The value is millisecond.                                                                                                              |
| _session_duration        | number    | true         | Added in all events. The value is millisecond.                                                                                                              |
| _session_number          | number    | true         | Added in all events.                                                                                                                                        |
| _page_title              | string    | true         | Added in all events.                                                                                                                                        |
| _page_url                | string    | true         | Added in all events.                                                                                                                                        |
| _latest_referrer         | string    | true         | Added in all events. The last off-site url.                                                                                                                 |
| _latest_referrer_host    | string    | true         | Added in all events. The last off-site domain name.                                                                                                         |

### Item attributes

| Attribute name | Data type | Required | Description                   |
|----------------|-----------|----------|-------------------------------|
| id             | string    | False    | The id of the item            |
| name           | string    | False    | The name of the item          |
| brand          | string    | False    | The brand of the item         |
| price          | string \| number | False    | The price of the item         |
| quantity       | string    | False    | The quantity of the item      |
| creative_name  | string    | False    | The creative name of the item |
| creative_slot  | string    | False    | The creative slot of the item |
| location_id    | string    | False    | The location id of the item   |
| category       | string    | False    | The category of the item      |
| category2      | string    | False    | The category2 of the item     |
| category3      | string    | False    | The category3 of the item     |
| category4      | string    | False    | The category4 of the item     |
| category5      | string    | False    | The category5 of the item     |

All attributes in item can only be the attributes in the above table, customization is not supported. Instead, you can use `category2` to `category5` to represent the custom attributes.

## Change log

[GitHub Change log](https://github.com/awslabs/clickstream-web/releases)

## Reference link

[Source code](https://github.com/awslabs/clickstream-web)

[Project issue](https://github.com/awslabs/clickstream-web/issues)
