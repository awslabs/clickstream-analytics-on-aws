# Data schema
This article explains the data schema and format in {{solution_name}}. This solution uses an **event-based** data model to store and analyze clickstream data, every activity (e.g., click, view) on the clients is modeled as an event with dimensions, each dimension represents a parameter of the event. Dimensions are common for all events, but customers have the flexibility to use JSON object to store custom event parameter as key-value pairs into special dimensions, which enables users to collect information that are specific for their business. Those JSON will be stored in special data types which allow customers to extract the values in the analytics engines.

## Database and table
For each project, the solution creates a database with name of `<project-id>` in Redshift and Athena. Each App will have a schema with name of `app_id`. In Athena, all tables are added partitions of app_id, year, month, and day. Based on the event data, the solution's data-processing module will create the following four base tables:

- **`event-v2`**: This table stores event data, each record represents an individual event. 
- **`user-v2`** : This table stores the latest user attributes, each record represents a visitor (pseudonymous user).
- **`item-v2`** : This table stores event-item data, each record represents an event that is associated with an item.
- **`session`** : This table stores session data, each record represents a session for each pseudonymous user. 


## Columns
Each column in the tables represents a specific parameter for an event, user, or item. Note that some parameters are nested within a Super field in Redshift or a Map field in Athena, and those fields (e.g., custom_parameters, user_properties) contains parameters that are repeatable. Table columns are described below.

### Event table
|**Field Name**| **Data Type - Redshift** | **Data Type - Athena** | **Description** |
|--------------|------------------------|------------------------|-------------------|
|event_timestamp| TIMESTAMP | TIMESTAMP | The timestamp (in microseconds, UTC) when the event was logged on the client.|
|event_id| VARCHAR | STRING | Unique ID for the event.|
|event_time_msec| BIGINT | BIGINT | The time in UNIX timestamp format (microseconds) when the event was logged on the client.|
|event_name| VARCHAR | STRING | The name of the event.|
|event_value| DOUBLE PRECISION | FLOAT | The value of the event's "value" parameter.|
|event_value_currency| VARCHAR | STRING | The currency of the value associated with the event.|
|event_bundle_sequence_id| BIGINT | BIGINT | The sequential ID of the bundle in which these events were uploaded.|
|ingest_time_msec| BIGINT | BIGINT | The time in UNIX timestamp format (microseconds) when the event was ingested to the server.|
| device.mobile_brand_name             | VARCHAR    |     STRING     | The device brand name.                                                                                   |
| device.mobile_model_name             | VARCHAR    |      STRING       | The device model name.                                                                                   |
| device.manufacturer                  | VARCHAR    |      STRING    | The device manufacturer name.                                                                               |
| device.carrier                       | VARCHAR    |     STRING       | The device network provider name.                              |
| device.network_type                  | VARCHAR    |     STRING      | The network_type of the device, e.g., WIFI, 5G                                                                     |
| device.operating_system              | VARCHAR    |    STRING        | The operating system of the device.                                                                                          |
| device.operating_system_version      | VARCHAR    |     STRING         | The OS version.                                                                                          |
| device.vendor_id                     | VARCHAR    |     STRING       | IDFV in iOS, Android ID (or UUID if Android ID is not available) in Android.                                                |
| device.advertising_id                | VARCHAR    |      STRING        | Advertising ID/IDFA.                                                                                     |
| device.system_language               | VARCHAR    |    STRING        | The OS language.                                                                                         |
| device.time_zone_offset_seconds      | BIGINT   |       BIGINT     | The offset from GMT in seconds.                                                                          |
| device.ua_browser                    | VARCHAR    |     STRING       | The browser in which the user viewed content, derived from User Agent string                                           |
| device.ua_browser_version      | VARCHAR    |       STRING      | The version of the browser in which the user viewed content, derive from User Agent                                            |
| device.ua_device            | VARCHAR    |            STRING    | The device in which user viewed content, derive from User Agent.                                                           |
| device.ua_device_category             | VARCHAR    |    STRING               | The device category in which user viewed content, derive from User Agent.                                               |
| device.ua_os            | VARCHAR    |            STRING    | The operating system of the device in which user viewed content, derive from User Agent.                                                 |
| device.ua_os_version             | VARCHAR    |    STRING               | The operating system version of the device category in which user viewed content, derive from User Agent.                     |
| device.ua             | SUPER    |    MAP       | The parsed User Agent in key-value pairs                    |
| device.screen_width             | VARCHAR    |        STRING           | The screen width of the device.                                                        |
| device.screen_height             | VARCHAR    |       STRING            | The screen height of the device.   |
| device.viewport_width             | VARCHAR    |        STRING           | The screen width of the browser viewport.                                                        |
| device.viewport_height             | VARCHAR    |       STRING            | The screen height of the browser viewport.   |
| geo.continent       |     VARCHAR      | STRING               | The continent from which events were reported, based on IP address.       |
| geo.sub_continent   |     VARCHAR         | STRING               | The subcontinent from which events were reported, based on IP address.    |
| geo.country         |      VARCHAR      | STRING               | The country from which events were reported, based on IP address.         |
| geo.region          |      VARCHAR        | STRING               | The region from which events were reported, based on IP address.          |
| geo.metro           |      VARCHAR      | STRING               | The metro from which events were reported, based on IP address.           |
| geo.city            |      VARCHAR       | STRING               | The city from which events were reported, based on IP address.            |
| geo.locale          |      VARCHAR       | STRING               | The locale information obtained from device.            | 
| traffic_source_source      | VARCHAR               |   STRING   | The traffic source (derive from utm_source) associated with the event.  |
| traffic_source_medium    | VARCHAR               |  STRING  | The traffic medium (derive from utm_medium, such as paid search, organic search, email, etc.) that associated with the event.  |
| traffic_source_campaign    | VARCHAR               |   STRING   | The marketing campaign (derive from utm_campaign) associated with the event.  | 
| traffic_source_content    | VARCHAR               |   STRING   | The marketing campaign content (derive from utm_content) associated with the event.  | 
| traffic_source_term    | VARCHAR               |   STRING   | The marketing campaign term (derive from utm_term) associated with the event.  | 
| traffic_source_campaign_id    | VARCHAR               |   STRING   | The marketing campaign id (derive from utm_id) associated with the event.  | 
| traffic_source_clid    | VARCHAR               |   STRING   | The click id associated with the event.  | 
| traffic_source_clid_platform    | VARCHAR               |   STRING   | The platform of the click id  associated with the event.  | 
| traffic_source_channel_group    | VARCHAR               |   STRING   | The channel group (assigned by traffic classification rules) associated with the event.  | 
| traffic_source_category    | VARCHAR               |   STRING   | The source category (i.e., Search, Social, Video, Shopping) based on the traffic source associated with the event.  | 
| user_first_touch_time_msec| BIGINT | BIGINT | The time in UNIX timestamp format (microseconds) when the user first touch the app or website.|
| app_package_id                  | VARCHAR               | STRING  | The package name or bundle ID of the app.                                    |
| app_version             | VARCHAR               | STRING    | The app's versionName (Android) or short bundle version.                     |
| app_title             | VARCHAR               | STRING    | The app's name.                     |
| app_id     | VARCHAR               | STRING    | The App ID (created by this solution) associated with the app.                                 |
| app_install_source      | VARCHAR               | STRING    | The store from which user installed the app.                                            |
| platform                 | VARCHAR               | STRING  | The data stream platform (Web, IOS or Android) from which the event originated.                                    |
| project_id     | VARCHAR               | STRING    | The project id associated with the app.                                 |
| screen_view_screen_name     | VARCHAR               | STRING    | The screen name associated with the event.                                 |
| screen_view_screen_id     | VARCHAR               | STRING    | The screen class id associated with the event.                                 |
| screen_view_screen_unique_id     | VARCHAR               | STRING    | The unique screen id associated with the event.                                 |
| screen_view_previous_screen_name     | VARCHAR               | STRING    | The previous screen name associated with the event.                                 |
| screen_view_previous_screen_id     | VARCHAR               | STRING    | The previous screen class id associated with the event.                                 |
| screen_view_previous_screen_unique_id     | VARCHAR               | STRING    | The previous unique screen id associated with the event.                                 |
| screen_view_entrances     | BOOLEAN               | BOOLEAN    | Whether the screen is the entrance view of the session.                                 |
| page_view_page_referrer     | VARCHAR               | STRING    | The referrer page url.                                 |
| page_view_page_referrer_title     | VARCHAR               | STRING    | The referrer page title.                                 |
| page_view_previous_time_msec| BIGINT | BIGINT | The timestamp of the previous page_view event. |
| page_view_engagement_time_msec    | BIGINT               | BIGINT    | The previous page_view duration in milliseconds.                                 |
| page_view_page_title     | VARCHAR               | STRING    | The title of the webpage associated with the event.                                 |
| page_view_page_url     | VARCHAR               | STRING    | The url of the webpage associated with the event.                                 |
| page_view_page_url_path     | VARCHAR               | STRING    | The url path of the webpage associated with the event.                                 |
| page_view_page_url_query_parameters     | SUPER               | MAP    | The query parameters in key-value pairs of the page url associated with the event.               |
| page_view_hostname     | VARCHAR               | STRING    | The host name of the web page associated with the event.                                 |
| page_view_latest_referrer     | VARCHAR               | STRING    | The url of the latest external referrer.                                 |
| page_view_latest_referrer_host     | VARCHAR               | STRING    | The hostname of the latest external referrer.                                 |
| page_view_entrances     | BOOLEAN               | BOOLEAN    | Whether the page is the entrance view of the session.                                 |
| app_start_is_first_time     | BOOLEAN               | BOOLEAN    | Whether the app start is a new app launch.                                 |
| upgrade_previous_app_version     | VARCHAR               | STRING    | Previous app version before app upgrade event.                                 |
| upgrade_previous_os_version     | VARCHAR               | STRING    | Previous os version before OS upgrade event.                                 |
| search_key     | VARCHAR               | STRING    | The name of the keyword in the URL when user perform search on web site.                                 |
| search_term     | VARCHAR               | STRING    | The search content in the URL when user perform search on web site.                                 |
| outbound_link_classes     | VARCHAR               | STRING    | The content of class in tag <a> that associated with the outbound link.                                 |
| outbound_link_domain     | VARCHAR               | STRING    | The domain of href in tag <a> that associated with the outbound link.                                 |
| outbound_link_id     | VARCHAR               | STRING    | The content of id in tag <a> that associated with the outbound link.                                 |
| outbound_link_url     | VARCHAR               | STRING    | The content of href in tag <a> that associated with the outbound link.                                 |
| outbound_link     | BOOLEAN               | BOOLEAN    | Whether the link is outbound link or not.                                 |
| user_engagement_time_msec    | BIGINT     | BIGINT    | The user engagement duration in milliseconds.                                 |
| user_id                     | VARCHAR    | STRING| The unique ID assigned to a user through `setUserId()` API.         |
| user_pseudo_id              | VARCHAR    | STRING| The pseudonymous id generated by SDK for the user.                     |
| session_id              | VARCHAR    | STRING| The session id associated with the event.                     |
| session_start_time_msec              | BIGINT    | BIGINT| The start time in UNIX timestamp of the session.                |
| session_duration              | BIGINT    | BIGINT| The duration the session lasts, in milliseconds.                |
| session_number              | BIGINT    | BIGINT| Number of the sessions generated from the client.                |
| scroll_engagement_time_msec | BIGINT    | BIGINT| The engagement time on the web page until user scroll.                |
| sdk_error_code | VARCHAR    | STRING| The error code generated by SDK when an event is invalid in some way.               |
| sdk_error_message | VARCHAR    | STRING| The error message generated by SDK an event is invalid in some way.               |
| sdk_version | VARCHAR    | STRING| The version of the SDK.               |
| sdk_name | VARCHAR    | STRING| The name of the SDK.               |
| app_exception_message | VARCHAR    | STRING| The exception message when the app crashes or throws an exception.       |
| app_exception_stack | VARCHAR    | STRING| The exception stack trace when the app crashes or throws an exception.       |
| custom_parameters_json_str | VARCHAR    | STRING| All the custom event parameters stored in key-value pairs.  |
| custom_parameters | SUPER    | MAP| All the custom event parameters stored in key-value pairs.  |
| process_info | SUPER    | MAP| Store information about the data processing.  |
| created_time | TIMESTAMP    | TIMESTAMP| Store information about the data processing.  |


### User table 
| Field name                  | Data type - Redshift | Data type - Athena | Description                                    |
|-----------------------------|-----------|--------|----------------------------------------------------------------------|
| event_timestamp          | BIGINT             |     STRING         | The timestamp of when the user attributes was collected.|
| user_id                     | VARCHAR    | STRING| The unique ID assigned to a user through `setUserId()` API.             |
| user_pseudo_id              | VARCHAR    | STRING| The pseudonymous id generated by SDK for the user.                     |
| user_properties                 | SUPER    |     ARRAY        | User custom properties of the user.                       |
| user_properties_json_str                 | VARCHAR    |     STRING        | Properties of the user.                        |
| first_touch_timestamp  | BIGINT   | BIGINT| The time (in microseconds) at which the user first opened the app or visited the site. |
| first_visit_date                 | Date    |     Date        | Date of the user's first visit                            |
| first_referrer                | VARCHAR    |     STRING        | The first referrer detected for the user                   |
| first_traffic_source               | VARCHAR    |     STRING        | The the network source that acquired the user that was first detected for the user, e.g., Google, Baidu                         |
| first_traffic_source_medium              | VARCHAR    |     STRING        | The medium of the network source that acquired the user that was first detected for the user, e.g., paid search, organic search, email, etc.                          |
| first_traffic_source_campaign              | VARCHAR    |     STRING        | The name of the marketing campaign that acquired the user that was first detected for the user.                          |
| first_traffic_source_content               | VARCHAR    |     STRING        | The marketing campaign content that acquired the user that was first detected for the user                      |
| first_traffic_source_term             | VARCHAR    |     STRING        | The keyword of the marketing ads that acquired the user that was first detected for the user.                          |
| first_traffic_source_campaign_id              | VARCHAR    |     STRING        | The id of the marketing campaign that acquired the user that was first detected for the user.                          |
| first_traffic_source_clid_platform             | VARCHAR    |     STRING        | The click id platform of the marketing campaign that acquired the user that was first detected for the user.                          |
| first_traffic_source_clid             | VARCHAR    |     STRING        | The click id of the marketing campaign that acquired the user that was first detected for the user.                          |
| first_traffic_source_channel_group             | VARCHAR    |     STRING        | The channel group of the traffic source that acquired the user that was first detected for the user.                          |
| first_traffic_source_category            | VARCHAR    |     STRING        | The source category (i.e., Search, Social, Video, Shopping) based on the traffic source that acquired the user for the first time.                          |
| first_app_install_source             | VARCHAR     |     STRING         | The install channel for the user, e.g., Google Play|
| process_info | SUPER    | MAP| Store information about the data processing.  |
| created_time | TIMESTAMP    | TIMESTAMP| Store information about the data processing.  |



### Session table 
| Field name                  | Data type - Redshift | Data type - Athena | Description                                    |
|-----------------------------|----------------------|-------------------|------------------------------------------------|
| event_timestamp             | TIMESTAMP            | STRING            | The timestamp of when the event occurred.      |
| user_pseudo_id              | VARCHAR        | STRING            | The pseudonymous ID generated by the SDK for the user. |
| session_id                  | VARCHAR        | STRING            | The ID assigned to a session.                   |
| user_id                     | VARCHAR        | STRING            | The unique ID assigned to a user through the `setUserId()` API. |
| session_number              | BIGINT               | INT               | The sequence number of the session in the client.         |
| session_start_time_msec     | BIGINT               | BIGINT            | The start time of the session in milliseconds.  |
| session_source              | VARCHAR        | STRING            | The traffic source of the session.                      |
| session_medium              | VARCHAR        | STRING            | The traffic source medium of the session.                      |
| session_campaign            | VARCHAR        | STRING            | The traffic source campaign of the session.                    |
| session_content             | VARCHAR        | STRING            | The traffic source content of the session.                     |
| session_term                | VARCHAR        | STRING            | The traffic source term of the session.                        |
| session_campaign_id         | VARCHAR        | STRING            | The traffic source campaign ID of the session.                 |
| session_clid_platform       | VARCHAR        | STRING            | The platform of the CLID (Click ID) of the session. |
| session_clid                | VARCHAR        | STRING            | The CLID (Click ID) of the session.              |
| session_channel_group       | VARCHAR        | STRING            | The traffic source channel group of the session.               |
| session_source_category     | VARCHAR        | STRING            | The traffic source category of the session source.             |
| process_info                | SUPER                | MAP               | Additional data processing information.                 |
| created_time                | TIMESTAMP            | STRING            | The timestamp of when the session data was created. |


### Item table 
| Field name                  | Data type - Redshift | Data type - Athena | Description                                    |
|-----------------------------|----------------------|-------------------|------------------------------------------------|
| event_timestamp             | TIMESTAMP            | STRING            | The timestamp of when the event occurred.      |
| event_id                    | VARCHAR        | STRING            | The ID of the event.                           |
| event_name                  | VARCHAR        | STRING            | The name of the event.                         |
| platform                    | VARCHAR        | STRING            | The platform associated with the event.         |
| user_pseudo_id              | VARCHAR        | STRING            | The pseudonymous ID generated by the SDK for the user. |
| user_id                     | VARCHAR        | STRING            | The unique ID assigned to a user through the `setUserId()` API. |
| item_id                     | VARCHAR        | STRING            | The ID of the item.                             |
| name                        | VARCHAR        | STRING            | The name of the item.                           |
| brand                       | VARCHAR        | STRING            | The brand of the item.                          |
| currency                    | VARCHAR        | STRING            | The currency associated with the item price.    |
| price                       | DOUBLE PRECISION     | DOUBLE            | The price of the item.                          |
| quantity                    | DOUBLE PRECISION     | DOUBLE            | The quantity of the item in the event             |
| creative_name               | VARCHAR        | STRING            | The name of the creative associated with the item. |
| creative_slot               | VARCHAR        | STRING            | The slot of the creative associated with the item. |
| location_id                 | VARCHAR        | STRING            | The ID of the location associated with the item. |
| category                    | VARCHAR        | STRING            | The category of the item.                       |
| category2                   | VARCHAR        | STRING            | The second category of the item.           |
| category3                   | VARCHAR        | STRING            | The third category of the item.            |
| category4                   | VARCHAR        | STRING            | The fourth category of the item.           |
| category5                   | VARCHAR        | STRING            | The fifth category of the item.            |
| custom_parameters_json_str  | VARCHAR       | STRING            | The JSON string representation of custom parameters.|
| custom_parameters           | SUPER                | MAP               | Additional custom parameters.                   |
| process_info                | SUPER                | MAP               | Additional process information.                 |
| created_time                | TIMESTAMP            | STRING            | The timestamp of when the item data was created. |

