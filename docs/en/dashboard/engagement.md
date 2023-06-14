# Engagement report
You can use the Engagement report to get insights into the engagement level of the users when using your websites and apps.  This report measures user engagement by the sessions that users trigger and the web pages and app screens that users visit.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of `Engagement`.

## Where the data comes from
Engagement report are created based on the QuickSight dataset of `Clickstream_Engagement`, which connects to the `clickstream-session-view` view in analytics engines (i.e., Redshift or Athena). Below is the SQL command that generates the view.
??? SQL Commands
    === "Redshift"
        ```sql
            with session as (
            select 
                es.session_id::varchar 
                ,user_pseudo_id
                ,platform
                -- to_date(event_date, 'YYYYMMDD') as event_date,
                ,max(session_duration) as session_duration
                ,(case when (max(session_duration)>10000 or sum(view) >1) then 1 else 0 end) as engaged_session
                ,(case when (max(session_duration)>10000 or sum(view) >1) then 0 else 1 end) as bounced_session
                ,min(session_st) as session_start_timestamp
                ,sum(view) as session_views
                ,sum(engagement_time) as session_engagement_time
            from (
                select 
                    user_pseudo_id
                    ,event_id
                    -- ,event_name
                    ,platform
                    ,(select 
                        ep.value.string_value as value 
                    from {{schema}}.ods_events e, e.event_params ep 
                    where 
                        ep.key = '_session_id' and e.event_id = ods.event_id) session_id
                    ,(select 
                        ep.value.int_value::int as value 
                    from {{schema}}.ods_events e, e.event_params ep 
                    where 
                        ep.key = '_session_duration' and e.event_id = ods.event_id) session_duration
                    ,(select 
                        ep.value.int_value::bigint as value 
                    from {{schema}}.ods_events e, e.event_params ep 
                    where 
                        ep.key = '_session_start_timestamp' and e.event_id = ods.event_id) session_st
                    ,(select 
                        ep.value.int_value::int as value 
                    from {{schema}}.ods_events e, e.event_params ep 
                    where 
                        ep.key = '_engagement_time_msec' and event_name = '_user_engagement' and e.event_id = ods.event_id) as engagement_time
                    ,(case when event_name in ('_screen_view', '_page_view') then 1 else 0 end) as view
                from {{schema}}.ods_events ods
            ) es group by 1,2,3), session_f_l_sv as
            ( select session_id, first_sv_event_id, last_sv_event_id, count(event_id) from (
                select 
                session_id::varchar
                , event_id
                -- ,event_name
                -- , event_timestamp
                ,first_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as first_sv_event_id,
                last_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as last_sv_event_id
                    from (
                        select e.event_name, e.event_id, e.event_timestamp, ep.value.string_value as session_id
                        from {{schema}}.ods_events e, e.event_params ep 
                        where e.event_name in ('_screen_view','_page_view')
                        and ep.key = '_session_id') ) group by 1,2,3
            ), session_f_sv_view as (
                select * from session_f_l_sv left outer join
                (select e.event_id as event_id, ep.value.string_value as first_sv_view
                from {{schema}}.ods_events e, e.event_params ep
                where ep.key in ('_screen_name','_page_title')) t on session_f_l_sv.first_sv_event_id=t.event_id
            ), session_f_l_sv_view as (
                select * from session_f_sv_view left outer join
                (select e.event_id as event_id, ep.value.string_value as last_sv_view
                from {{schema}}.ods_events e, e.event_params ep
                where ep.key in ('_screen_name','_page_title')) t on session_f_sv_view.last_sv_event_id=t.event_id
            )
            select 
                session.session_id
                ,user_pseudo_id
                ,platform
                ,session_duration
                ,session_views
                ,engaged_session
                ,bounced_session
                ,session_start_timestamp
                ,session_engagement_time
                ,DATE_TRUNC('day', TIMESTAMP 'epoch' + session_start_timestamp/1000 * INTERVAL '1 second') as session_date
                ,DATE_TRUNC('hour', TIMESTAMP 'epoch' + session_start_timestamp/1000 * INTERVAL '1 second') as session_date_hour
                ,first_sv_view::varchar as entry_view
                ,last_sv_view::varchar as exit_view
            from session left outer join session_f_l_sv_view on session.session_id = session_f_l_sv_view.session_id;
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
            clickstream_session_mv_1 as (
            SELECT
                es.session_id 
                ,user_pseudo_id
                ,platform
                ,max(session_duration) as session_duration
                ,(case when (max(session_duration)>10000 or sum(view) >1) then 1 else 0 end) as engaged_session
                ,(case when (max(session_duration)>10000 or sum(view) >1) then 0 else 1 end) as bounced_session
                ,min(session_st) as session_start_timestamp
                ,sum(view) as session_views
                ,sum(engagement_time) as session_engagement_time
            FROM
            (SELECT 
                    user_pseudo_id
                    ,event_id
                    ,platform
                    ,(select 
                        ep.value.string_value as value 
                    from base e cross join unnest(event_params) as t(ep) 
                    where 
                        ep.key = '_session_id' and e.event_id = ods.event_id) session_id
                    ,cast((select 
                        ep.value.int_value as value 
                    from base e cross join unnest(event_params) as t(ep) 
                    where 
                        ep.key = '_session_duration' and e.event_id = ods.event_id) as integer) session_duration
                    ,cast((select 
                        ep.value.int_value as value 
                    from base e cross join unnest(event_params) as t(ep) 
                    where 
                        ep.key = '_session_start_timestamp' and e.event_id = ods.event_id) as bigint) session_st
                    ,cast((select 
                        ep.value.int_value as value 
                    from base e cross join unnest(event_params) as t(ep) 
                    where 
                        ep.key = '_engagement_time_msec' and event_name = '_user_engagement' and e.event_id = ods.event_id) as integer)  as engagement_time
                    ,cast((case when event_name in ('_screen_view', '_page_view') then 1 else 0 end) as integer) as view
                FROM base ods
            ) AS es
            GROUP BY 1,2,3
            ),
            clickstream_session_mv_2 as (
            select session_id, first_sv_event_id, last_sv_event_id, count(event_id) from (
                select 
                session_id
                , event_id
                ,first_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as first_sv_event_id,
                last_value(event_id) over(partition by session_id order by event_timestamp asc rows between unbounded preceding and unbounded following) as last_sv_event_id
                    from (
                        select e.event_name, e.event_id, e.event_timestamp, ep.value.string_value as session_id
                        from base e cross join unnest(event_params) as t(ep) 
                        where e.event_name in ('_screen_view','_page_view')
                        and ep.key = '_session_id') 
            ) group by 1,2,3
            ),
            session_f_sv_view as (
                select * from clickstream_session_mv_2 as session_f_l_sv left outer join
                (select e.event_id as event_id, ep.value.string_value as first_sv_view
                from base e cross join unnest(event_params) as t(ep) 
                where ep.key in ('_screen_name','_page_title')) t on session_f_l_sv.first_sv_event_id=t.event_id
            ), 
            session_f_l_sv_view as (
                select * from session_f_sv_view left outer join
                (select e.event_id as event_id, ep.value.string_value as last_sv_view
                from base e cross join unnest(event_params) as t(ep) 
                where ep.key in ('_screen_name','_page_title')) t on session_f_sv_view.last_sv_event_id=t.event_id
            )
            select 
                session.session_id
                ,user_pseudo_id
                ,platform
                ,session_duration
                ,session_views
                ,engaged_session
                ,bounced_session
                ,session_start_timestamp
                ,session_engagement_time
                ,DATE_TRUNC('day', from_unixtime(session_start_timestamp/1000)) as session_date
                ,DATE_TRUNC('hour', from_unixtime(session_start_timestamp/1000)) as session_date_hour
                ,first_sv_view as entry_view
                ,last_sv_view as exit_view
            from clickstream_session_mv_1 as session left outer join 
            session_f_l_sv_view on session.session_id = session_f_l_sv_view.session_id

        ```

## Dimensions and metrics
The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`session_id`| Dimension | A SDK-generated unique id for the session user triggered when useing your websites and apps | Query from analytics engine|
|`user_pseudo_id`| Dimension | A SDK-generated unique id for the user  | Query from analytics engine|
|`platform`| Dimension | The platform user used during the session  | Query from analytics engine|
|`session_duration`| Dimension | The length of the session in millisecond  | Query from analytics engine|
|`session_views`| Metric | Number of screen view or page view within the session  | Query from analytics engine|
|`engaged_session`| Dimension | Whether the session is engaged or not. </br>`Engaged session is defined as if the session last more than 10 seconds or have two or more screen views page views` | Query from analytics engine|
|`session_start_timestamp`| Dimension | The start timestame of the session  | Query from analytics engine|
|`session_engagement_time`| Dimension | The total engagement time of the session in millisecond  | Query from analytics engine|
|`entry_view`| Dimension | The screen name or page title of the first screen or page user viewed in the session  | Query from analytics engine|
|`exit_view`| Dimension | The screen name or page title of the last screen or page user viewed in the session  | Query from analytics engine|
|`Average engaged session per user`| Metric | Average number of session per user in the selected time period  | Calculated field in QuickSight|
|`Average engagement time per session`| Metric | Average engagement time per session in the selected time period  | Calculated field in QuickSight|
|`Average engagement time per user`| Metric | Average engagement time per user in the selected time period  | Calculated field in QuickSight|
|`Average screen view per user`| Metric | Average number of screen views per user in the selected time period  | Calculated field in QuickSight|

