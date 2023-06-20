# Retention report
You can use the Retention report to get insights into how frequently and for how long users engage with your website or mobile app after their first visit. The report helps you understand how well your app is doing in terms of attracting users back after their first visit.

Note: This article describes the default report. You can customize the report by applying filters or comparisons or by changing the dimensions, metrics, or charts in QuickSight. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/working-with-visuals.html)


## View the report
1. Access the dashboard for your application. Refer to [Access dashboard](index.md)
2. In the dashboard, click on the sheet with name of **`Retention`**.

## Where the data comes from
Retention report are created based on the following QuickSight dataset:

- `Clickstream_Lifecycle_Weekly`, which connects to the `clickstream-lifecycle-weekly` view in analytics engines (i.e., Redshift or Athena). 
- `Clickstream_Lifecycle_Daily`, which connects to the `clickstream-lifecycle-daily` view in analytics engines (i.e., Redshift or Athena). 
- `Clickstream_Events` that connects to the `clickstream-ods-events` view in analytics engines

Below is the SQL command that generates the view.
??? SQL Commands
    === "Redshift"
        ```sql
        -- clickstream-lifecycle-weekly view
        with weekly_usage as (
        select 
            user_pseudo_id, 
            -- datediff(week, '1970-01-01', dateadd(ms,event_timestamp, '1970-01-01')) as time_period
            DATE_TRUNC('week', dateadd(ms,event_timestamp, '1970-01-01')) as time_period
        from {{app_id}}.ods_events
        where event_name = '_session_start' group by 1,2 order by 1,2),
        -- detect if lag and lead exists
        lag_lead as (
        select user_pseudo_id, time_period,
            lag(time_period,1) over (partition by user_pseudo_id order by user_pseudo_id, time_period),
            lead(time_period,1) over (partition by user_pseudo_id order by user_pseudo_id, time_period)
        from weekly_usage),
        -- caculate lag and lead size
        lag_lead_with_diffs as (
        select user_pseudo_id, time_period, lag, lead, 
            datediff(week,lag,time_period) lag_size,
            datediff(week,time_period,lead) lead_size
            -- time_period-lag lag_size, 
            -- lead-time_period lead_size 
        from lag_lead),
        -- case to lifecycle stage
        calculated as (select time_period,
        case when lag is null then '1-NEW'
            when lag_size = 1 then '2-ACTIVE'
            when lag_size > 1 then '3-RETURN'
        end as this_week_value,
        case when (lead_size > 1 OR lead_size IS NULL) then '0-CHURN'
            else NULL
        end as next_week_churn,
        count(distinct user_pseudo_id)
        from lag_lead_with_diffs
        group by 1,2,3)
        select time_period, this_week_value, sum(count) 
        from calculated group by 1,2
        union
        select time_period+7, '0-CHURN', -1*sum(count) 
        from calculated where next_week_churn is not null group by 1,2
        order by 1;

        -- clickstream-lifecycle-daily view
        with daily_usage as (
        select 
            user_pseudo_id, 
            -- datediff(week, '1970-01-01', dateadd(ms,event_timestamp, '1970-01-01')) as time_period
            DATE_TRUNC('day', dateadd(ms,event_timestamp, '1970-01-01')) as time_period
        from {{schema}}.ods_events
        where event_name = '_session_start' group by 1,2 order by 1,2),
        -- detect if lag and lead exists
        lag_lead as (
        select user_pseudo_id, time_period,
            lag(time_period,1) over (partition by user_pseudo_id order by user_pseudo_id, time_period),
            lead(time_period,1) over (partition by user_pseudo_id order by user_pseudo_id, time_period)
        from daily_usage),
        -- caculate lag and lead size
        lag_lead_with_diffs as (
        select user_pseudo_id, time_period, lag, lead, 
            datediff(day,lag,time_period) lag_size,
            datediff(day,time_period,lead) lead_size
            -- time_period-lag lag_size, 
            -- lead-time_period lead_size 
        from lag_lead),
        -- case to lifecycle stage
        calculated as (select time_period,
        case when lag is null then '1-NEW'
            when lag_size = 1 then '2-ACTIVE'
            when lag_size > 1 then '3-RETURN'
        end as this_day_value,
        case when (lead_size > 1 OR lead_size IS NULL) then '0-CHURN'
            else NULL
        end as next_day_churn,
        count(distinct user_pseudo_id)
        from lag_lead_with_diffs
        group by 1,2,3)
        select time_period, this_day_value, sum(count) 
        from calculated group by 1,2
        union
        select time_period+1, '0-CHURN', -1*sum(count) 
        from calculated where next_day_churn is not null group by 1,2
        order by 1;

        ```
    === "Athena"
        ```sql
        -- clickstream-lifecycle-weekly-query
        with weekly_usage as (
        select 
            user_pseudo_id, 
            DATE_TRUNC('week', event_date) as time_period
        from {{database}}.{{eventTable}}
        where partition_app = ? 
            and partition_year >= ?
            and partition_month >= ?
            and partition_day >= ?
            and event_name = '_session_start' group by 1,2 order by 1,2
        ),
        lag_lead as (
        select user_pseudo_id, time_period,
            lag(time_period,1) over (partition by user_pseudo_id order by user_pseudo_id, time_period) as lag,
            lead(time_period,1) over (partition by user_pseudo_id order by user_pseudo_id, time_period) as lead
        from weekly_usage
        ),
        lag_lead_with_diffs as (
        select user_pseudo_id, time_period, lag, lead, 
            date_diff('week',lag,time_period) lag_size,
            date_diff('week',time_period,lead) lead_size
        from lag_lead
        ),
        calculated as (
        select time_period,
            case when lag is null then '1-NEW'
            when lag_size = 1 then '2-ACTIVE'
            when lag_size > 1 then '3-RETURN'
            end as this_week_value,
            case when (lead_size > 1 OR lead_size IS NULL) then '0-CHURN'
            else NULL
            end as next_week_churn,
            count(distinct user_pseudo_id) as cnt
        from lag_lead_with_diffs
        group by 1,2,3
        )
        select time_period, this_week_value, sum(cnt) as cnt from calculated group by 1,2
        union
        select date_add('day', 7, time_period), '0-CHURN', -1*sum(cnt) as cnt
        from calculated 
        where next_week_churn is not null 
        group by 1,2

        -- clickstream-lifecycle-daily-query
        with daily_usage as (
        select 
            user_pseudo_id, 
            DATE_TRUNC('day', event_date) as time_period
        from {{database}}.{{eventTable}} 
        where partition_app = ? 
            and partition_year >= ?
            and partition_month >= ?
            and partition_day >= ?
            and event_name = '_session_start' group by 1,2 order by 1,2
        ),
        lag_lead as (
        select user_pseudo_id, time_period,
            lag(time_period,1) over (partition by user_pseudo_id order by user_pseudo_id, time_period) as lag,
            lead(time_period,1) over (partition by user_pseudo_id order by user_pseudo_id, time_period) as lead
        from daily_usage
        ),
        lag_lead_with_diffs as (
        select user_pseudo_id, time_period, lag, lead, 
            date_diff('day',lag,time_period) lag_size,
            date_diff('day',time_period,lead) lead_size
        from lag_lead
        ),
        calculated as (
        select time_period,
            case when lag is null then '1-NEW'
            when lag_size = 1 then '2-ACTIVE'
            when lag_size > 1 then '3-RETURN'
            end as this_day_value,
        
            case when (lead_size > 1 OR lead_size IS NULL) then '0-CHURN'
            else NULL
            end as next_day_churn,
            count(distinct user_pseudo_id) as cnt
        from lag_lead_with_diffs
        group by 1,2,3
        )
        select time_period, this_day_value, sum(cnt) as cnt
        from calculated group by 1,2
        union
        select date_add('day', 1, time_period) as time_period, '0-CHURN', -1*sum(cnt) as cnt 
        from calculated 
        where next_day_churn is not null 
        group by 1,2;

        ```

## Dimensions and metrics
The report includes the following dimensions and metrics. You can add more dimensions or metrics by creating `calculated field` in QuickSight dateset. [Learn more](https://docs.aws.amazon.com/quicksight/latest/user/adding-a-calculated-field-analysis.html). 

|Field | Type| What is it | How it's populated|
|----------|---|---------|--------------------|
|`Daily Active User (DAU)`| Metric | Number of active users per date | QuickSight aggregation|
|`Weekly Active User (WAU)`| Metric | Number of active users in last 7 days | Calculated field in QuickSight|
|`Monthly Active User (MAU)`| Metric | Number of active users in last 30 days  | Calculated field in QuickSight|
|`user_pseudo_id`| Dimension | A SDK-generated unique id for the user | Query from analytics engine|
|`user_id`| Dimension | The user ID set via the setUserId API in SDK  | Query from analytics engine|
|`DAU/WAU`| Metric | DAU/WAU % for user stickiness  | Calculated field in QuickSight|
|`WAU/MAU`| Metric | WAU/MAU % for user stickiness  | Calculated field in QuickSight|
|`DAU/MAU`| Metric | DAU/MAU % for user stickiness  | Calculated field in QuickSight|
|`Event User Type`| Dimension | The type of user performed the event, i.e., new user or existing user  | Calculated field in QuickSight|
|`User first touch date`| Metric |The first date that a user use your websites or apps  | Calculated field in QuickSight|
|`Retention rate`| Metric | Distinct active users number / Distinct active user number by User first touch date | Calculated field in QuickSight|
|`time_period`| Dimension | The week or day for the user lifecycle  | Query from analytics engine|
|`this_week_value`| Dimension | The user lifecycle stage, i.e., New, Active, Return, and Churn  | Query from analytics engine|
|`this_day_value`| Dimension | The user lifecycle stage, i.e., New, Active, Return, and Churn   | Query from analytics engine|

