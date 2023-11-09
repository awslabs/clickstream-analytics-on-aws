# Clickstream HTTP API

## Introduction

This documentation will help you send your clickstream data directly to the Clickstream ingestion server via HTTP
requests. The Clickstream data processing module will correctly process your data simultaneously by following the
guidelines below. Then, you can visually analyze them in the subsequent report module.

## Request endpoint

After creating the application in the solution web console, you will get the **Server Endpoint** and **App ID** on the
details page. For example:

- **Server Endpoint**: `https://example.com/collect`
- **App ID**: `my_app`

## API Specification

1. The app ID in the query parameters must be one of the applications you create for the project in the solution web
   console. Otherwise, the server will respond to HTTP status code 403.
2. The request body contains four parts: common attributes, items, user, and attributes. The public attributes require
   the `event_type`, `event_id`, `timestamp`, and `app_id`; the rest are optional parameters.
3. The total size of the body of a single request cannot exceed 1MB. The HTTP status code 413 will return if it exceeds.

### Reqeust method

**`POST`**

### Request headers

| Parameter name   | Required | Example                                                                                                                             | Description                                                                                                                                           |
|------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| Content-Type     | YES      | application/json; charset=utf-8                                                                                                     | Content type                                                                                                                                          |
| X-Forwarded-For  | NO       | [101.188.67.134](https://whatismyipaddress.com/page/36)                                                                             | Source IP address, it's required if you forward the client requests to clickstream servers from your servers                                          |
| User-Agent       | NO       | Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36 | User-Agent                                                                                                                                            |
| cookie           | NO       | your auth cookie                                                                                                                    | The authentication token for your request. Please refer to [server side configuration](./../pipeline-mgmt/ingestion/configure-ingestion-endpoint.md). |

### Request query parameters

| Parameter name           | Required  | Example             | Description                                                                                                 |
|--------------------------|-----------|---------------------|-------------------------------------------------------------------------------------------------------------|
| appId                    | YES       | test_app            | The app ID for your application is created in the solution web console                                      |
| platform                 | NO        | Android/iOS/Web/... | Distinguish between platforms                                                                               |
| event_bundle_sequence_id | NO        | 1                   | Request sequence number, an incrementing integer starting from 1                                            |
| hashCode                 | NO        | 478acd09            | The first eight digits of the sha256 calculation result of the request body string                          |
| compression              | NO        | gzip                | Request body compression method. Currently, only gzip is supported. Keeping it absent means no compression  |

### Request body

The request body is an array structure that contains the JSON string of one or more events. For example:

```json
[
  {
    "event_type": "button_click",
    "event_id": "460daa08-0717-4385-8f2e-acb5bd019ee7",
    "timestamp": 1667877566697,
    "app_id": "your appId",
    "attributes": {
      "productName": "shoes",
      "Price": 99.9
    }
  },
  {
    "event_type": "item_view",
    "event_id": "c6067c1c-fd8d-4fdb-bfaf-cc1212ca0195",
    "timestamp": 1667877565698,
    "app_id": "your appId",
    "attributes": {
      "productName": "book",
      "Price": 39.9
    }
  }
]
```

### Event attributes

| Attributes name  | Required | Data Type | Example                                                                                                                                                                                                                                                                                                                                          | Description                                                                                                                                                                                                                                                                                                                                                                                                                                           |
|------------------|----------|-----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| event_type       | YES      | String    | button_click                                                                                                                                                                                                                                                                                                                                     | Event type                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| event_id         | YES      | String    | 460daa08-0717-4385-8f2e-acb5bd019ee7                                                                                                                                                                                                                                                                                                             | Event's unique ID, we recommend using `UUID` to generate                                                                                                                                                                                                                                                                                                                                                                                              |
| timestamp        | YES      | Long      | 1667877566697                                                                                                                                                                                                                                                                                                                                    | The timestamp when the event was generated, in milliseconds                                                                                                                                                                                                                                                                                                                                                                                           |
| app_id           | YES      | String    | shopping_dev                                                                                                                                                                                                                                                                                                                                     | The corresponding id when creating the application in the Clickstream web console                                                                                                                                                                                                                                                                                                                                                                     |
| platform         | NO       | String    | Android/iOS/Web/...                                                                                                                                                                                                                                                                                                                              | Device platform                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| os_version       | NO       | String    | 10                                                                                                                                                                                                                                                                                                                                               | System version                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| unique_id        | NO       | String    | c84ad28d-16a8-4af4-a331-f34cdc7a7a18                                                                                                                                                                                                                                                                                                             | Unique ID to identify different users and associate the behavior of logged-in and not logged-in                                                                                                                                                                                                                                                                                                                                                       |
| device_id        | NO       | String    | f24bec657ea8eff7                                                                                                                                                                                                                                                                                                                                 | Distinguish between different devices                                                                                                                                                                                                                                                                                                                                                                                                                 |
| make             | NO       | String    | Samsung                                                                                                                                                                                                                                                                                                                                          | Device manufactory                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| brand            | NO       | String    | Samsung                                                                                                                                                                                                                                                                                                                                          | Device brand                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| model            | NO       | String    | S23 Ultra                                                                                                                                                                                                                                                                                                                                        | Device model                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| carrier          | NO       | String    | CDMA                                                                                                                                                                                                                                                                                                                                             | Device network operator name                                                                                                                                                                                                                                                                                                                                                                                                                          |
| network_type     | NO       | String    | Mobile                                                                                                                                                                                                                                                                                                                                           | Current device network type                                                                                                                                                                                                                                                                                                                                                                                                                           |
| locale           | NO       | String    | zh_CN                                                                                                                                                                                                                                                                                                                                            | Local information                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| system_language  | NO       | String    | zh                                                                                                                                                                                                                                                                                                                                               | Device language code                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| country_code     | NO       | String    | CN                                                                                                                                                                                                                                                                                                                                               | Device country code                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| zone_offset      | NO       | int       | 2880000                                                                                                                                                                                                                                                                                                                                          | Device's raw offset from GMT in milliseconds                                                                                                                                                                                                                                                                                                                                                                                                          |
| screen_height    | NO       | int       | 1920                                                                                                                                                                                                                                                                                                                                             | Screen height in pixels                                                                                                                                                                                                                                                                                                                                                                                                                               |
| screen_width     | NO       | int       | 1080                                                                                                                                                                                                                                                                                                                                             | Screen width in pixels                                                                                                                                                                                                                                                                                                                                                                                                                                |
| viewport_height  | NO       | int       | 540                                                                                                                                                                                                                                                                                                                                              | App viewport height                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| viewport_width   | NO       | int       | 360                                                                                                                                                                                                                                                                                                                                              | App viewport width                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| sdk_version      | NO       | String    | 1.2.3                                                                                                                                                                                                                                                                                                                                            | SDK version                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| sdk_name         | NO       | String    | aws-solution-clickstream-sdk                                                                                                                                                                                                                                                                                                                     | SDK name                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| app_package_name | NO       | String    | com.example.app                                                                                                                                                                                                                                                                                                                                  | User's Application package name                                                                                                                                                                                                                                                                                                                                                                                                                       |
| app_version      | NO       | String    | 1.1.0                                                                                                                                                                                                                                                                                                                                            | Application version number                                                                                                                                                                                                                                                                                                                                                                                                                            |
| app_title        | NO       | String    | shopping                                                                                                                                                                                                                                                                                                                                         | Application name                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| items            | NO       | Object    | [{<br/>	&nbsp;&nbsp;"id": "b011ddc3-632f-47cb-a68a-ad83678ecfed",<br/>	&nbsp;&nbsp;"name": "Classic coat-rack",<br/>	&nbsp;&nbsp;"category": "housewares",<br/>	&nbsp;&nbsp;"price": 167<br/>}]                                                                                                                                                  | Item list, Supports uploading multiple items at one time. A maximum of 100 items can be uploaded at one time<br>For the item quantity limit, please refer to [Event and Attribute Limitation](./web.md#event-and-attribute-limitation) <br>For the supported attributes of the item, please refer to [item attribute](./web.md#item-attributes)                                                                                                       |
| user             | NO       | Object    | {<br/>&nbsp;&nbsp;"_user_id": {<br/>&nbsp;&nbsp;&nbsp;&nbsp;"value": "0202d0e1",<br/>&nbsp;&nbsp;&nbsp;&nbsp;"set_timestamp": 1695006816345<br/>  &nbsp;&nbsp;},<br/> &nbsp;&nbsp; "username": {<br/>   &nbsp;&nbsp;&nbsp;&nbsp; "value": "carl",<br/>    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"set_timestamp": 1695006816345<br/>  &nbsp;&nbsp;}<br/>} | User attributes. Each attribute key is the user attribute name. Each attribute contains an object. The object contains two attributes: <br>`value`: The value of the user attribute. <br>`set_timestamp`: The timestamp millisecond value when setting the attribute. <br> Up to 100 user attributes can be added to an event. For specific restrictions, please refer to: [Event and Attribute Limitations](./web.md#event-and-attribute-limitation) |
| attributes       | NO       | Object    | {<br/>	&nbsp;&nbsp;"productName": "book",<br/>	&nbsp;&nbsp;"Price": 39.9<br/>}                                                                                                                                                                                                                                                                   | Custom attributes. Up to 500 custom attributes can be added to an event, and the attribute name must meet the [naming rules](./web.md#naming-rules)                                                                                                                                                                                                                                                                                                   |

### Request response

If the HttpCode status code returned by the request is 200, the request is considered successful, other status codes are
failures, and the request does not return any other content.

#### HttpCode

| Code        | Description                                                                                                                                            |
|-------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| 200         | Request successful                                                                                                                                     |
| 403         | Request failed. Please check if appId and endpoint match, if configured with authentication, please check whether the authentication cookie is correct |
| 413         | Request failed. The request body exceeds 1MB                                                                                                           |

## Request code example

=== "cURL"

    ```bash
    curl --location 'https://example.com/collect?appId=test_release&platform=Android&event_bundle_sequence_id=1' \
    --header 'Content-Type: application/json; charset=utf-8' \
    --header 'X-Forwarded-For: 101.188.67.134' \
    --data '[{"event_type":"button_click","event_id":"460daa08-0717-4385-8f2e-acb5bd019ee7","timestamp":1667877566697,"app_id":"your appId","attributes":{"productName":"shoes","Price":99.9}},{"event_type":"item_view","event_id":"c6067c1c-fd8d-4fdb-bfaf-cc1212ca0195","timestamp":1667877565698,"app_id":"your appId","attributes":{"productName":"book","Price":39.9}}]'
    ```

=== "C# HttpClient"

    ```c#
    var client = new HttpClient();
    var request = new HttpRequestMessage(HttpMethod.Post, "https://example.com/collect?appId=test_release&platform=Android&event_bundle_sequence_id=1");
    request.Headers.Add("X-Forwarded-For", "101.188.67.134");
    var content = new StringContent("[{\"event_type\":\"button_click\",\"event_id\":\"460daa08-0717-4385-8f2e-acb5bd019ee7\",\"timestamp\":1667877566697,\"app_id\":\"your appId\",\"attributes\":{\"productName\":\"shoes\",\"Price\":99.9}},{\"event_type\":\"item_view\",\"event_id\":\"c6067c1c-fd8d-4fdb-bfaf-cc1212ca0195\",\"timestamp\":1667877565698,\"app_id\":\"your appId\",\"attributes\":{\"productName\":\"book\",\"Price\":39.9}}]", null, "application/json; charset=utf-8");
    request.Content = content;
    var response = await client.SendAsync(request);
    response.EnsureSuccessStatusCode();
    Console.WriteLine(await response.Content.ReadAsStringAsync());
    ```

=== "Java Okhttp"

    ```java
    OkHttpClient client=new OkHttpClient().newBuilder()
            .build();
            MediaType mediaType=MediaType.parse("application/json; charset=utf-8");
            RequestBody body=RequestBody.create(mediaType,"[{\"event_type\":\"button_click\",\"event_id\":\"460daa08-0717-4385-8f2e-acb5bd019ee7\",\"timestamp\":1667877566697,\"app_id\":\"your appId\",\"attributes\":{\"productName\":\"shoes\",\"Price\":99.9}},{\"event_type\":\"item_view\",\"event_id\":\"c6067c1c-fd8d-4fdb-bfaf-cc1212ca0195\",\"timestamp\":1667877565698,\"app_id\":\"your appId\",\"attributes\":{\"productName\":\"book\",\"Price\":39.9}}]");
            Request request=new Request.Builder()
            .url("https://example.com/collect?appId=test_release&platform=Android&event_bundle_sequence_id=1")
            .method("POST",body)
            .addHeader("Content-Type","application/json; charset=utf-8")
            .addHeader("X-Forwarded-For","101.188.67.134")
            .build();
            Response response=client.newCall(request).execute();
    ```

=== "JavaScript Fetch"

    ```javascript
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json; charset=utf-8");
    myHeaders.append("X-Forwarded-For", "101.188.67.134");
    
    var raw = "[{\"event_type\":\"button_click\",\"event_id\":\"460daa08-0717-4385-8f2e-acb5bd019ee7\",\"timestamp\":1667877566697,\"app_id\":\"your appId\",\"attributes\":{\"productName\":\"shoes\",\"Price\":99.9}},{\"event_type\":\"item_view\",\"event_id\":\"c6067c1c-fd8d-4fdb-bfaf-cc1212ca0195\",\"timestamp\":1667877565698,\"app_id\":\"your appId\",\"attributes\":{\"productName\":\"book\",\"Price\":39.9}}]";
    
    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };
    
    fetch("https://example.com/collect?appId=test_release&platform=Android&event_bundle_sequence_id=1", requestOptions)
        .then(response => response.text())
        .then(result => console.log(result))
        .catch(error => console.log('error', error));
    ```

=== "Python Request"

    ```python
    import requests
    
    url = "https://example.com/collect?appId=test_release&platform=Android&event_bundle_sequence_id=1"
    
    payload = "[{\"event_type\":\"button_click\",\"event_id\":\"460daa08-0717-4385-8f2e-acb5bd019ee7\",\"timestamp\":1667877566697,\"app_id\":\"your appId\",\"attributes\":{\"productName\":\"shoes\",\"Price\":99.9}},{\"event_type\":\"item_view\",\"event_id\":\"c6067c1c-fd8d-4fdb-bfaf-cc1212ca0195\",\"timestamp\":1667877565698,\"app_id\":\"your appId\",\"attributes\":{\"productName\":\"book\",\"Price\":39.9}}]"
    headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Forwarded-For': '101.188.67.134'
    }
    
    response = requests.request("POST", url, headers=headers, data=payload)
    
    print(response.text)
    ```

## Verification data reported successfully

- Method 1: You can query the **ods_events table** in **Athena** directly through SQL. (Requires Athena to be enabled in
  data modeling)
- Method 2: You can query the **ods_events table** in **Redshift** directly through SQL. (Requires Redshift to be
  enabled in data modeling)