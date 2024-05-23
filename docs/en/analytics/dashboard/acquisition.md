# Acquisition report
You can use the acquisition report to get insights into how new users arrive at your website or app for the first time, as well as the sources of everyday traffic. 

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md/#view-dashboards)
2. In the dashboard, click on the sheet with name of **`Acquisition`**.

## Data sources
Acquisition report is created based on the following QuickSight datasets:

|QuickSight dataset | Redshift view / table| Description | 
|----------|--------------------|------------------|
|`User_User_View-<app>-<project>`|`clickstream_acquisition_day_user_view_cnt` | This dataset stores data on the number of new users and number of active users on your websites or apps for each day|
|`Day_Traffic_Source_User-<app>-<project>`|`clickstream_acquisition_day_traffic_source_user`|This dataset stores data on the number of new users per each traffic source type for each day|
|`Day_User_Acquisition-<app>-<project>`|`clickstream_acquisition_day_user_acquisition` |This dataset stores data on the number of new users, number of active users, number of sessions, number of engaged sessions, and number of events per each traffic source type for each day |
|`Country_New_User_Acquisition-<app>-<project>`|`clickstream_acquisition_country_new_user`|This dataset stores data on the number of new users per each country and city for each day|


## Dimensions
The Acquisition report includes the following dimensions.

|Dimension | Description| How it's calculated| 
|----------|--------------------|---------|
| First user traffic source | The source of the traffic that acquires new users to your websites or apps (for example, google, baidu, and bing)  | Traffic source is populated from utm parameters in page_url (i.e., utm_source) or traffic-source preserved attribute (i.e., _traffic_source_source), or derived from referrer url (only for web). [Learn more](../data-mgmt/traffic-source.md)|
| First user traffic medium | The medium of the traffic that acquires new users to your websites or apps (for example, organic, paid search)  | Traffic medium is populated from utm parameters in page_url (i.e., utm_medium) or traffic-source preserved attribute (i.e., _traffic_source_medium), or derived from referrer url (only for web). [Learn more](../data-mgmt/traffic-source.md)|
| First user traffic campaign | The name of a promotion or marketing campaign that acquires new users to your websites or apps.  | Traffic campaign is populated from utm parameters in page_url (i.e., utm_campaign) and traffic-source preserved attribute (i.e., _traffic_source_campaign), or derived from referrer url (only for web). [Learn more](../data-mgmt/traffic-source.md)|
| First user traffic source / Medium | The combination of traffic source and medium that acquires new users to your websites or apps.  | Same as above for traffic source and traffic medium. [Learn more]()|
| First user traffic channel group | Channel groups are rule-based definitions of the traffic sources. The name of the traffic channel group that acquires new users to your websites or apps.  | Traffic channel group is derived based on the traffic source and medium. [Learn more](../data-mgmt/traffic-source.md)|
| First user traffic clid platform | The name of platform for click id (auto-tagging from advertisement platform) that acquires new users to your websites or apps.  | Traffic source clid platform is populated from clid parameter in page_url and traffic-source preserved attribute (i.e., _traffic_source_clid_platform). [Learn more](../data-mgmt/traffic-source.md)|
| First user app install source | The name of app store that acquires new users to your apps, for example, App Store, Google Store.  | App install source is from traffic-source preserved attribute (i.e., _app_install_channel). [Learn more](../data-mgmt/traffic-source.md)|
| Session traffic source | The traffic source that acquires users into a new session on your websites or apps (for example, google, baidu, and bing)  | Traffic source is populated from utm parameters in page_url (i.e., utm_source) or traffic-source preserved attribute (i.e., _traffic_source_source), or derived from referrer url (only for web). [Learn more](../data-mgmt/traffic-source.md)|
| Session traffic medium | The traffic medium that acquires users into a new session on your websites or apps (for example, organic, paid search)  | Traffic medium is populated from utm parameters in page_url (i.e., utm_medium) or traffic-source preserved attribute (i.e., _traffic_source_medium), or derived from referrer url (only for web). [Learn more](../data-mgmt/traffic-source.md)|
| Session traffic campaign | The name of a promotion or marketing campaign that acquires users into a new session on your websites or apps.  | Traffic campaign is populated from utm parameters in page_url (i.e., utm_campaign) and traffic-source preserved attribute (i.e., _traffic_source_campaign), or derived from referrer url (only for web). [Learn more](../data-mgmt/traffic-source.md)|
| Session traffic Source / Medium | The combination of traffic source and medium that acquires users into a new session on your websites or apps.  | Same as above for traffic source and traffic medium. [Learn more](../data-mgmt/traffic-source.md)|
| Session traffic channel group | Channel groups are rule-based definitions of the traffic sources. The name of the traffic channel group that acquires users into a new session on your websites or apps.  | Traffic channel group is derived based on the traffic-source and medium. [Learn more](../data-mgmt/traffic-source.md)|
|Session traffic clid platform | The name of platform for click id (auto-tagging from advertisement platform) that acquires users into new session on your websites or apps.  | Traffic clid platform is populated from clid parameter in page_url and traffic-source preserved attribute (i.e., _traffic_source_clid_platform). [Learn more](../data-mgmt/traffic-source.md)|
|Geo country| The country where users are when they are using your websites or apps  | Geo location information is inferred based on user IP address.|
|Geo city| The city where the users are when they are using your websites or apps  | Geo location information is inferred based on user IP address.|

## Metrics
The Acquisition report includes the following metrics.

|Metric | Definition| How it's populated| 
|----------|--------------------|---------|
| New users |The number of users who interacted with your site or launched your app for the first time (event triggered: _first_open).| Count distinct user_id or user_pseudo_id (if user_id is not available) when event_name equals '_first_open'.|
| Active users | The number of distinct users who triggered any event in the selected time range.| Count distinct user_id or user_pseudo_id (if user_id is not available) at any event| 
| Sessions | The number of sessions users created.| Count distinct session_id. |
| Engaged Session | The number of sessions that lasted 10 seconds or longer, or had 1 or more page or screen views.| Count distinct session_id if the session is engaged. |
| Engaged Rate | The percentage of sessions that were engaged sessions.| Engaged sessions / total sessions. |
| Events | The number of times users triggered an event.| Count event_id. |
| Avg_engagement_time_per_user | The average time per user that your website was in focus in a user's browser or an app was in the foreground of a user's device.| Total user engagement durations / Number of active users |
  
## Sample dashboard
Below image is a sample dashboard for your reference.

![dashboard-acquisition](../../images/analytics/dashboard/acquisition.png)

















