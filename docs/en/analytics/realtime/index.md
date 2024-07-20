# Realtime 
Realtime lets you monitor clickstream data on your website or app in second-level latency. 

## Prerequisites 
1. You must enable realtime analysis for the data pipeline of your project.
2. You must enable realtime streaming for the app.

## Start and stop
You can start and stop the realtime data streaming by switching on and off the toggle to avoid unnecessary cost. In the backend, this option starts and stops the Flink application which processes the clickstream events. 

## Data sources and metrics
Realtime report is created based on the following QuickSight datasets:

|QuickSight dataset | Redshift view / table| Metric description | 
|----------|--------------------|------------------|
|`Realtime_Event_Country-rt-<app>-<project>`|`ods_events_streaming_view` | This dataset stores the number of active users on your websites or apps by country in last one hour.|
|`Realtime_Event_City-rt-<app>-<project>`|`ods_events_streaming_view` | This dataset stores the number of active users on your websites or apps by city in last one hour.|
|`Realtime_Event_Platform-rt-<app>-<project>`|`ods_events_streaming_view` | This dataset stores the number of active users on your websites or apps by platform in last one hour.|
|`Realtime_Event_Name-rt-<app>-<project>`|`ods_events_streaming_view` | This dataset stores the number of active users on your websites or apps by event name in last one hour.|
|`Realtime_Event_Page_Screen-rt-<app>-<project>`|`ods_events_streaming_view` | This dataset stores the number of active users on your websites or apps by page title or screen name in last one hour.|
|`Realtime_Event_Traffic-rt-<app>-<project>`|`ods_events_streaming_view` | This dataset stores the number of active users on your websites or apps by traffic source in last one hour.|
|`Realtime_Event_User-rt-<app>-<project>`|`ods_events_streaming_view` | This dataset stores the number of active users on your websites or apps by each minute in last one hour.|
