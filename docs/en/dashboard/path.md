# Path Explorer report
You can use the Path Explorer report to get insights into the user journey when users using your apps or websites, it helps you understand the sequence of events and screen or page transition in your apps.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Path explorer`**.

## Where the data comes from
Device report are created based on the following QuickSight dataset:

- `Clickstream_Path`, which connects to the `clickstream-path-mv` view in analytics engines (i.e., Redshift or Athena). 

Below is the SQL command that generates the view.
??? SQL Commands
    === "Redshift"
        ```sql
        -- clickstream-path view
        with event_data as (
        select 
            user_pseudo_id
            ,event_date
            ,event_id
            ,event_name
            ,event_timestamp
            ,platform
            ,(select 
                ep.value.string_value as value 
            from {{schema}}.ods_events e, e.event_params ep 
            where 
                ep.key = '_session_id' and e.event_id = ods.event_id)::varchar session_id
            ,(select 
                    ep.value.string_value::varchar as screen_name 
                from {{schema}}.ods_events e, e.event_params ep 
                where 
                    ep.key = '_screen_name' and event_name = '_screen_view' and e.event_id = ods.event_id) as current_screen
        from notepad_v.ods_events ods), ranked_events as ( select 
            *,
            DENSE_RANK() OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) event_rank,
            LAG(event_name,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) previous_event,
            LEAD(event_name,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) next_event,
            LAG(current_screen,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) previous_screen,
            LEAD(current_screen,1) OVER (PARTITION BY  user_pseudo_id, session_id ORDER BY event_timestamp ASC)  next_screen
        FROM event_data) select * from ranked_events
        ```
    === "Athena"
        ```sql
        with base as (
            select 
                *
            from {{database}}.{{eventTable}}
            where partition_app = ? 
                and partition_year >= ?
                and partition_month >= ?
                and partition_day >= ?
            ),
            event_data as (
            select 
                user_pseudo_id
                ,event_date
                ,event_id
                ,event_name
                ,event_timestamp
                ,platform
                ,(select 
                    ep.value.string_value as value 
                from base cross join unnest(event_params) as t(ep) 
                where 
                    ep.key = '_session_id' and event_id = ods.event_id
                ) session_id
                ,(select 
                    ep.value.string_value as screen_name 
                from base cross join unnest(event_params) as t(ep) 
                where ep.key = '_screen_name' and event_name = '_screen_view' and event_id = ods.event_id
                ) as current_screen
                from base ods 
            ), 
            ranked_events as (
            select 
                *,
                DENSE_RANK() OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) event_rank,
                LAG(event_name,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) previous_event,
                LEAD(event_name,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) next_event,
                LAG(current_screen,1) OVER (PARTITION BY user_pseudo_id, session_id ORDER BY event_timestamp ASC) previous_screen,
                LEAD(current_screen,1) OVER (PARTITION BY  user_pseudo_id, session_id ORDER BY event_timestamp ASC)  next_screen
            FROM event_data
            ) 
            select * from ranked_events


        ```

## Dimensions and metrics
The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`event_id`| Dimension | The unique ID for the event|Query from analytics engine|
|`user_pseudo_id`| Dimension | A SDK-generated unique id for the user | Query from analytics engine|
|`event_date`| Dimension | The event data of when the device information was logged | Query from analytics engine|
|`event_timestamp`| Dimension | The timestamp when event happened  | Query from analytics engine|
|`platform`| Dimension | The platform user used when event is logged  | Query from analytics engine|
|`session_id`| Dimension | A SDK-generated unique id for the session user triggered when using your websites and apps | Query from analytics engine|
|`current_screen`| Dimension | The screen user is on for the event, 'null' for those events are not viewing screen or webpage | Query from analytics engine|
|`event_rank`| Dimension | The sequence of the event in a session | Query from analytics engine|
|`previous_event`| Dimension | The  event name of  previous event | Query from analytics engine|
|`next_event`| Dimension | The  event name of next event | Query from analytics engine|
|`previous_screen`| Dimension | The screen name of  previous screen | Query from analytics engine|
|`next_screen`| Dimension | The  screen name of  next screen | Query from analytics engine|



