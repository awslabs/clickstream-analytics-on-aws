# Clickstream Unity SDK

## Introduction

Clickstream Unity SDK can help you easily collect click stream data from browser to your AWS environments through the
data pipeline provisioned by this solution.
The SDK provide easy to use API for data collection. we've added features that automatically collect common user events
and attributes (for example, app start and scene load) to simplify data collection for users.

## Integrate the SDK

### Include SDK

We use Unity Package Manager to distribute our SDK

1. Open `Window` and click `Package Manager` in Unity Editor.
2. Click `+` button, then select `Add package from git URL...`
3. Input `https://github.com/awslabs/clickstream-unity` , then click `Add` to wait for completion.

### Initialize the SDK

```c#
using ClickstreamAnalytics;

ClickstreamAnalytics.Init(new ClickstreamConfiguration
{
    AppId = "your AppId",
    Endpoint = "https://example.com/collect"
});
```

### Start using

#### Record event

```c#
using ClickstreamAnalytics;

var attributes = new Dictionary<string, object>
{
    { "event_category", "shoes" },
    { "currency", "CNY" },
    { "value", 279.9 }
};
ClickstreamAnalytics.Record("button_click", attributes);

// record event with name
ClickstreamAnalytics.Record('button_click');
```

#### Login and logout

```c#
using ClickstreamAnalytics;

// when user login success.
ClickstreamAnalytics.SetUserId("UserId");

// when user logout
ClickstreamAnalytics.SetUserId(null);
```

#### Add user attribute

```c#
using ClickstreamAnalytics;

var userAttrs = new Dictionary<string, object> {
    { "userName", "carl" },
    { "userAge", 22 }
};
ClickstreamAnalytics.SetUserAttributes(userAttrs);
```

When opening for the first time after integrating the SDK, you need to manually set the user attributes once, and current login user's attributes will be cached in PlayerPrefs, so the next time game start you don't need to set all user's attribute again, of course you can use the same api `ClickstreamAnalytics.SetUserAttributes()` to update the current user's attribute when it changes.

#### Add global attribute

1. Add global attributes when initializing the SDK

    The following example code shows how to add global attributes when initializing the SDK.
   
    ```c#
    using ClickstreamAnalytics;
   
    ClickstreamAnalytics.Init(new ClickstreamConfiguration
    {
        AppId = "your AppId",
        Endpoint = "https://example.com/collect",
        GlobalAttributes = new Dictionary<string, object>
        {
            { "_app_install_channel", "Amazon Store" }
        }
    });
    ```    

2. Add global attributes after initializing the SDK

    ```c#
    using ClickstreamAnalytics;
    
    ClickstreamAnalytics.SetGlobalAttributes(new Dictionary<string, object>
    {
        { "_traffic_source_source", "Search engine" }, { "level", 10 }
    });
    ```

It is recommended to set global attributes when initializing the SDK, global attributes will be included in all events that occur after it is set, you also can remove a global attribute by setting its value to `null`.

#### Other configurations

In addition to the required `AppId` and `Endpoint`, you can configure other information to get more customized usage:

```c#
using ClickstreamAnalytics;

ClickstreamAnalytics.Init(new ClickstreamConfiguration
{
    AppId = "your AppId",
    Endpoint = "https://example.com/collect",
    SendEventsInterval = 10000,
    IsCompressEvents = true,
    IsLogEvents = false,
    IsTrackAppStartEvents = true,
    IsTrackAppEndEvents = true,
    IsTrackSceneLoadEvents = true,
    IsTrackSceneUnLoadEvents = true
});
```

Here is an explanation of each option:

| Name                     | Required | Default value | Description                                                                 |
|--------------------------|----------|---------------|-----------------------------------------------------------------------------|
| AppId                    | true     | --            | the app id of your application in Clickstream web console                   |
| Endpoint                 | true     | --            | the endpoint path you will upload the event to Clickstream ingestion server |
| SendEventsInterval       | false    | 10000         | event sending interval millisecond                                          |
| IsLogEvents              | false    | false         | whether to print out event json in console for debugging                    |
| IsTrackAppStartEvents    | false    | true          | whether auto record app start events when application focused               |
| IsTrackAppEndEvents      | false    | true          | whether auto record app end events when application not focused             |
| IsTrackSceneLoadEvents   | false    | true          | whether auto record scene load events                                       |
| IsTrackSceneUnLoadEvents | false    | true          | whether auto record scene unload events                                     |

#### Configuration update

You can update the default configuration after initializing the SDK, below are the additional configuration options you can customize.

```c#
using ClickstreamAnalytics;

ClickstreamAnalytics.UpdateConfiguration(new Configuration
{
    AppId = "your AppId",
    Endpoint = "https://example.com/collect",
    IsCompressEvents = false,
    IsLogEvents = true,
    IsTrackAppStartEvents = false,
    IsTrackAppEndEvents = false,
    IsTrackSceneLoadEvents = false,
    IsTrackSceneUnLoadEvents = false
});
```

#### Debug events

You can follow the steps below to view the event raw json and debug your events.

1. Using `ClickstreamAnalytics.Init()` API and set the `IsLogEvents` attribute to true in debug mode.
2. Integrate the SDK and start your game in Unity Editor, then open the **Console** tab.
3. Input `[ClickstreamAnalytics]` in the filter, and you will see the json content of all events recorded by Clickstream Unity SDK.

## Data format definition

### Data types

Clickstream Unity SDK supports the following data types:

| Data type | Range                                                  | Sample                 |
|-----------|--------------------------------------------------------|------------------------|
| int       | -2,147,483,648 ~ 2,147,483,647                         | 42                     |
| uint      | 0 ~ 4,294,967,295                                      | 123456U                |
| byte      | 0 ~ 255                                                | (byte)5                |
| sbyte     | -128 ~ 127                                             | (sbyte)-10             |
| short     | -32,768 ~ 32,767                                       | (short)-200            |
| ushort    | 0 ~ 65,535                                             | (ushort)1000           |
| long      | -9,223,372,036,854,775,808 ~ 9,223,372,036,854,775,807 | 9876543210L            |
| ulong     | 0 ~ 18,446,744,073,709,551,615                         | 12345678901234567890UL |
| float     | +- 1.5E-45 ~ +- 3.4E+38                                | 19.99f                 |
| double    | +- 5E-324 ~ +- 1.7E+308                                | 3.141592653589793      |
| decimal   | +- 1.0E-28 ~ +- 7.9228E+28                             | 0.075m                 |
| bool      | true, false                                            | true                   |
| string    | max support 1024 characters                            | "clickstream"          |

### Naming rules

1. The event name and attribute name cannot start with a number, and only contains: uppercase and lowercase letters,
   numbers, underscores, if the event name is invalid, the SDK will record `_clickstream_error` event, if the attribute
   or user attribute name is invalid, the attribute will be discarded and also record `_clickstream_error` event.

2. Do not use `_` as prefix to naming event name and attribute name, `_` is the preset from Clickstream Analytics.

3. The event name and attribute name are in case-sensitive, so the event `Add_to_cart` and `add_to_cart` will be
   recognized as two different event.

### Event and attribute limitation

In order to improve the efficiency of querying and analysis, we apply limits to event data as follows:

| Name                               | Suggestion           | Hard limit           | Strategy                                                                           | Error code |
|------------------------------------|----------------------|----------------------|------------------------------------------------------------------------------------|------------|
| Event name invalid                 | --                   | --                   | discard event, print log and record `_clickstream_error` event                     | 1001       |
| Length of event name               | under 25 characters  | 50 characters        | discard event, print log and record `_clickstream_error` event                     | 1002       |
| Length of event attribute name     | under 25 characters  | 50 characters        | discard the attribute,  print log and record error in event attribute              | 2001       |
| Attribute name invalid             | --                   | --                   | discard the attribute,  print log and record error in event attribute              | 2002       |
| Length of event attribute value    | under 100 characters | 1024 characters      | discard the attribute,  print log and record error in event attribute              | 2003       |
| Event attribute per event          | under 50 attributes  | 500 event attributes | discard the attribute that exceed, print log and record error in event attribute   | 2004       |
| Event attribute value type invalid | --                   | --                   | discard the attribute that exceed, print log and record error in event attribute   | 2005       |
| User attribute number              | under 25 attributes  | 100 user attributes  | discard the attribute that exceed, print log and record `_clickstream_error` event | 3001       |
| Length of User attribute name      | under 25 characters  | 50 characters        | discard the attribute, print log and record `_clickstream_error` event             | 3002       |
| User attribute name invalid        | --                   | --                   | discard the attribute, print log and record `_clickstream_error` event             | 3003       |
| Length of User attribute value     | under 50 characters  | 256 characters       | discard the attribute, print log and record `_clickstream_error` event             | 3004       |
| User attribute value type invalid  | --                   | --                   | discard the attribute, print log and record `_clickstream_error` event             | 3005       |


!!! info "Important"

    - The character limits are the same for single-width character languages (e.g., English) and double-width character languages (e.g., Chinese).
    - The limit of event attribute per event include preset attributes.
    - If the attribute or user attribute with the same name is added more than twice, the latest value will apply.
    - All errors that exceed the limit will be recorded `_error_code` and `_error_message` these two attribute in the event attributes.

## Preset events

### Automatically collected events

| Event name         | Triggered                                                  | Event Attributes                                                                                      |
|--------------------|------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| _first_open        | the first time user launches the application               |                                                                                                       |
| _app_start         | every time the game focused                                | 1. _is_first_time(when it is the first `_app_start` event after the game starts, the value is `true`) |
| _app_end           | every time the game unfocused                              |                                                                                                       |
| _scene_load        | every time the scene load                                  | 1. _scene_name <br>2. _scene_path                                                                     |
| _scene_unload      | every time the scene unload                                | 1. _scene_name <br>2. _scene_path                                                                     |
| _profile_set       | when the `SetUserAttributes()` or `SetUserId()` API called |                                                                                                       |
| _clickstream_error | event_name is invalid or user attribute is invalid         | 1. _error_code <br>2. _error_message                                                                  |


## Event attributes

### Sample event structure

```json
{
   "event_type": "_app_start",
   "event_id": "e83980c4-e89a-407f-9d73-a63cb5d53928",
   "device_id": "D9149255-7373-5EB6-8187-017D3854D8C9",
   "unique_id": "f716a7b1-34c4-4f15-a63e-e38cbf8d695a",
   "app_id": "myAppId",
   "timestamp": 1719982758903,
   "platform": "Mac",
   "os_version": "Mac OS X 14.4.1",
   "make": "Apple",
   "model": "MacBookPro17,1",
   "locale": "en-US",
   "zone_offset": 28800000,
   "network_type": "WIFI",
   "screen_width": 2880,
   "screen_height": 1800,
   "system_language": "en",
   "country_code": "US",
   "sdk_name": "aws-solution-clickstream-sdk",
   "sdk_version": "0.1.0",
   "app_package_name": "com.example.game",
   "app_version": "1.0",
   "user": {
      "_user_id": {
         "value": "12345",
         "set_timestamp": 1719978926974
      },
      "_user_first_touch_timestamp": {
         "value": 1719804098750,
         "set_timestamp": 1719804098750
      }
   },
   "attributes": {
      "player_name": "test player",
      "_app_install_channel": "Amazon Store",
      "level": 10
   }
}
```

All user attributes will be stored in `user` object, and all custom attributes are in `attributes` object.

### Common attributes

| Attribute name   | Data type  | Description                                                       | How to generate                                                                                                                                                                                                                                                         | Usage and purpose                                                                                     |
|------------------|------------|-------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| event_type       | string     | event name                                                        | set by developer or SDK                                                                                                                                                                                                                                                 | distinguish different events type                                                                     |
| event_id         | string     | the unique id for event                                           | generated from `Guid.NewGuid().ToString()` when the event create                                                                                                                                                                                                        | distinguish different events                                                                          |
| device_id        | string     | the unique id for device                                          | generated from `SystemInfo.deviceUniqueIdentifier`, if the value is null or empty, we will use `Guid.NewGuid().ToString()` as deviceId, the deviceId will stored in PlayerPref and will never be changed before application uninstall                                   | distinguish different devices                                                                         |
| unique_id        | string     | the unique id for user                                            | generated from `Guid.NewGuid().ToString()` when the sdk first initialization<br>it will be changed if user logout and then login to a new user. When user re-login to the previous user in the same browser, the unique_Id will be reset to the same previous unique_id | the unique id to identity different users and associating the behavior of logged-in and not logged-in |
| app_id           | string     | the app_id for your app                                           | app_id was generated by clickstream solution when you register an app to a data pipeline                                                                                                                                                                                | identify the events for your apps                                                                     |
| timestamp        | number     | event create timestamp in millisecond                             | generated from `DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()` when event create                                                                                                                                                                                       | data analysis needs                                                                                   |
| platform         | string     | the platform name                                                 | generated from `Application.platform`, and we will convert it to the types `Android`, `iOS`, `Mac`, `Windows`, `PS4` ,`PS5`, `Switch`, `VisionOS`, `Xbox`, `Linux` and `UNKNOWN`                                                                                        | data analysis needs                                                                                   |
| os_version       | String     | the platform version code                                         | generated from `SystemInfo.operatingSystem`                                                                                                                                                                                                                             | data analysis needs                                                                                   |
| make             | string     | the browser make                                                  | generated from `SystemInfo.graphicsDeviceVendor`                                                                                                                                                                                                                        | data analysis needs                                                                                   |
| model            | String     | model of the device                                               | generated from `SystemInfo.deviceModel`                                                                                                                                                                                                                                 | data analysis needs                                                                                   |
| locale           | string     | the default locale(language, country and variant) for the browser | generated from `CultureInfo.CurrentCulture.Name`                                                                                                                                                                                                                        | data analysis needs                                                                                   |
| zone_offset      | number     | the device raw offset from GMT in milliseconds.                   | generated from `TimeZoneInfo.Local.GetUtcOffset(DateTime.Now).TotalMilliseconds`                                                                                                                                                                                        | data analysis needs                                                                                   |
| network_type     | String     | the current device network type                                   | "Mobile", "WIFI" or "UNKNOWN"<br>generated from `Application.internetReachability`                                                                                                                                                                                      | data analysis needs                                                                                   |
| screen_width     | number     | the screen width pixel                                            | generated from `Screen.currentResolution.width`                                                                                                                                                                                                                         | data analysis needs                                                                                   |
| screen_height    | number     | the screen height pixel                                           | generated from `Screen.currentResolution.height`                                                                                                                                                                                                                        | data analysis needs                                                                                   |
| system_language  | string     | the browser language code                                         | generated from `CultureInfo.CurrentCulture.Name`                                                                                                                                                                                                                        | data analysis needs                                                                                   |
| country_code     | string     | country/region code for the browser                               | generated from `CultureInfo.CurrentCulture.Name`                                                                                                                                                                                                                        | data analysis needs                                                                                   |
| sdk_name         | string     | clickstream sdk name                                              | this will always be `aws-solution-clickstream-sdk`                                                                                                                                                                                                                      | data analysis needs                                                                                   |
| sdk_version      | string     | clickstream sdk version                                           | generated from `package.json`                                                                                                                                                                                                                                           | data analysis needs                                                                                   |
| app_package_name | String     | the app package name of user's app                                | generated from `Application.identifier`                                                                                                                                                                                                                                 | data analysis needs                                                                                   |
| app_version      | String     | the app version name of user's app                                | generated from `Application.version`                                                                                                                                                                                                                                    | data analysis needs                                                                                   |

### User attributes

| Attribute name              | Description                                                                                                 |
|-----------------------------|-------------------------------------------------------------------------------------------------------------|
| _user_id                    | Reserved for user id that is assigned by app                                                                |
| _user_ltv_revenue           | Reserved for user lifetime value                                                                            |
| _user_ltv_currency          | Reserved for user lifetime value currency                                                                   |
| _user_first_touch_timestamp | Added to the user object for all events. The time (in millisecond) when the user first open the application |

### Event attributes

| Attribute name                | Data type | Auto   track | Description                                                                                                                                                       |
|-------------------------------|-----------|--------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| _traffic_source_source        | String    | false        | Reserved for traffic source source. Name of the network source that acquired the user when the event were reported. Example: Google, Facebook, Bing, Baidu        |
| _traffic_source_medium        | String    | false        | Reserved for traffic source medium. Use this attribute to store the medium that acquired user when events were logged. Example: Email, Paid search, Search engine |
| _traffic_source_campaign      | String    | false        | Reserved for traffic source campaign. Use this attribute to store the campaign of your traffic source. Example: summer_sale, holiday_specials                     |
| _traffic_source_campaign_id   | String    | false        | Reserved for traffic source campaign id. Use this attribute to store the campaign id of your traffic source. Example: campaign_1, campaign_2                      |
| _traffic_source_term          | String    | false        | Reserved for traffic source term. Use this attribute to store the term of your traffic source. Example: running_shoes, fitness_tracker                            |
| _traffic_source_content       | String    | false        | Reserved for traffic source content. Use this attribute to store the content of your traffic source. Example: banner_ad_1, text_ad_2                              |
| _traffic_source_clid          | String    | false        | Reserved for traffic source clid. Use this attribute to store the clid of your traffic source. Example: amazon_ad_123, google_ad_456                              |
| _traffic_source_clid_platform | String    | false        | Reserved for traffic source clid platform. Use this attribute to store the clid platform of your traffic source. Example: amazon_ads, google_ads                  |
 | _app_install_channel          | String    | false        | Reserved for install source, it is the channel for app was downloaded                                                                                             |

## Change log

[GitHub Change log](https://github.com/awslabs/clickstream-unity/releases)


## Reference link

[Source code](https://github.com/awslabs/clickstream-unity)

[Project issue](https://github.com/awslabs/clickstream-unity/issues)
