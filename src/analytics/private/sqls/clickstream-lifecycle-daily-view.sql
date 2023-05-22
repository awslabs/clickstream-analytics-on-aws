CREATE MATERIALIZED VIEW {{schema}}.clickstream_lifecycle_daily_view 
BACKUP NO
AUTO REFRESH YES
AS
with daily_usage as (
  select 
    user_pseudo_id, 
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
  from calculated where next_day_churn is not null group by 1,2;