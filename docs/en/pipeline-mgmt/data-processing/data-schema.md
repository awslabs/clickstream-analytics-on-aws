# Data schema
This article explains the data schema and format in {{solution_name}}. This solution uses an **event-based** data model to store and analyze clickstream data, every activity (e.g., click, view) on the clients is modeled as an event with dimensions, each dimension represents a parameter of the event. Dimensions are common for all events, but customers have the flexibility to use JSON object to store custom event parameter as key-value pairs into special dimensions, which enables users to collect information that are specific for their business. Those JSON will be stored in special data types which allow customers to extract the values in the analytics engines.

## Database and table
For each project, the solution creates a database with name of `<project-id>` in Redshift and Athena. Each App will have a schema with name of `app_id`, within which event-related data are stored in `event` and `event_parameter` tables, user-related data are stored in `user` table, item-related data are stored in `item` table. In Athena, all tables are added partitions of app_id, year, month, and day. Below diagram illustrates the table relationship.

![table-relationship](../../images/pipe-mgmt/table_relationship.png)


## Columns
Each column in the tables represents a specific parameter for a event, user, or item. Note that some parameters are nested within a Super field in Redshift or a Map field  in Athena, and those fields (e.g., custom_parameters, user_properties) contains parameters that are repeatable. Table columns are described below.

### Event table fields
|**Field Name**| **Data Type - Redshift** | **Data Type - Athena** | **Description** |
|--------------|------------------------|------------------------|-------------------|
|event_id| VARCHAR | STRING | Unique ID for the event.|
|event_date| DATE | DATE | The date when the event was logged (YYYYMMDD format in UTC).|
|event_timestamp| BIGINT | BIGINT | The time (in microseconds, UTC) when the event was logged on the client.|
|event_previous_timestamp| BIGINT | BIGINT | The time (in microseconds, UTC) when the event was previously logged on the client.|
|event_name| VARCHAR | STRING | The name of the event.|
|event_value_in_usd| BIGINT | BIGINT | The currency-converted value (in USD) of the event's "value" parameter.|
|event_bundle_sequence_id| BIGINT | BIGINT | The sequential ID of the bundle in which these events were uploaded.|
|ingest_timestamp| BIGINT | BIGINT | Timestamp offset between collection time and upload time in micros.|
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
| device.ua_browser                    | VARCHAR    |     STRING       | The browser in which the user viewed content, derived from User Agent string                                                            |
| device.ua_browser_version      | VARCHAR    |       STRING      | The version of the browser in which the user viewed content, derive from User Agent                                            |
| device.ua_device            | VARCHAR    |            STRING    | The device in which user viewed content, derive from User Agent.                                                           |
| device.ua_device_category             | VARCHAR    |    STRING               | The device category in which user viewed content, derive from User Agent.                                                           |
| device.screen_width             | VARCHAR    |        STRING           | The screen width of the device.                                                           |
| device.screen_height             | VARCHAR    |       STRING            | The screen height of the device.   
| geo.continent       |     VARCHAR      | STRING               | The continent from which events were reported, based on IP address.       |
| geo.sub_continent   |     VARCHAR         | STRING               | The subcontinent from which events were reported, based on IP address.    |
| geo.country         |      VARCHAR      | STRING               | The country from which events were reported, based on IP address.         |
| geo.region          |      VARCHAR        | STRING               | The region from which events were reported, based on IP address.          |
| geo.metro           |      VARCHAR      | STRING               | The metro from which events were reported, based on IP address.           |
| geo.city            |      VARCHAR       | STRING               | The city from which events were reported, based on IP address.            |
| geo.locale          |      VARCHAR       | STRING               | The locale information obtained from device.            | 
| traffic_source.name      | VARCHAR               |   STRING   | Name of the marketing campaign that acquired the user when the events were reported.  |
| traffic_source.medium    | VARCHAR               |  STRING  | Name of the medium (paid search, organic search, email, etc.) that  acquired the user when the events were reported.  |
| traffic_source.source    | VARCHAR               |   STRING   | Name of the network source that acquired the user when the event were reported.  | 
| app_info.id                  | VARCHAR               | STRING  | The package name or bundle ID of the app.                                    |
| app_info.app_id     | VARCHAR               | STRING    | The App ID (created by this solution) associated with the app.                                 |
| app_info.install_source      | VARCHAR               | STRING    | The store that installed the app.                                            |
| app_info.version             | VARCHAR               | STRING    | The app's versionName (Android) or short bundle version.                     |
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

### Event_parameter table fields
|**Field Name**| **Data Type - Redshift** | **Data Type - Athena** | **Description** |
|---------------------------|--------------------|------------------------|---------------------------------------------------------|
| event_timestamp          | BIGINT             |     STRING         | The time (in microseconds, UTC) when the event was logged on the client.                        |
| event_id          | VARCHAR             |     BIGINT         | Unique ID for the event.                        |
|event_name| VARCHAR | STRING | The name of the event.|
| event_params_key          | VARCHAR             |     STRING         | The name of the event parameter.                        |
| event_params_string_value  |     VARCHAR          | STRING          | If the event parameter is represented by a string, such as a URL or campaign name, it is populated in this field. |
| event_params_int_value	 |         BIGINT           | INTEGER                | If the event parameter is represented by an integer, it is populated in this field. |
| event_params_double_value  |   DOUBLE PRECISION  | FLOAT       | If the event parameter is represented by a double value, it is populated in this field. |
| event_params_float_value  |    DOUBLE PRECISION  | FLOAT          | If the event parameter is represented by a floating point value, it is populated in this field. This field is not currently in use. |


### User table fields
| Field name                  | Data type - Redshift | Data type - Athena | Description                                                                  |
|-----------------------------|-----------|--------|----------------------------------------------------------------------|
| event_timestamp          | BIGINT             |     STRING         | The timestamp of when the user attributes was collected.                        |
| user_id                     | VARCHAR    | STRING| The unique ID assigned to a user through `setUserId()` API.                                            |
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
