CREATE MATERIALIZED VIEW {{schema}}.{{viewName}}
BACKUP NO
AUTO REFRESH YES
AS
with weekly_usage as (
  select 
    user_pseudo_id, 
    DATE_TRUNC('week', dateadd(ms,event_timestamp, '1970-01-01')) as time_period
  from {{schema}}.event
  where event_name = '_session_start' group by 1,2 order by 1,2),
-- detect if lag and lead exists
lag_lead as (
  select user_pseudo_id, time_period,
    lag(time_period,1) over (partition by user_pseudo_id order by user_pseudo_id, time_period),
    lead(time_period,1) over (partition by user_pseudo_id order by user_pseudo_id, time_period)
  from weekly_usage),
-- calculate lag and lead size
lag_lead_with_diffs as (
  select user_pseudo_id, time_period, lag, lead, 
    datediff(week,lag,time_period) lag_size,
    datediff(week,time_period,lead) lead_size
  from lag_lead),
-- case to lifecycle stage
calculated as (
  select 
    time_period,
    this_week_value,
    next_week_churn,
    count(user_pseudo_id) as total_users
  from (
    select time_period,
      case when lag is null then '1-NEW'
        when lag_size = 1 then '2-ACTIVE'
        when lag_size > 1 then '3-RETURN'
      end as this_week_value,
      case when (lead_size > 1 OR lead_size IS NULL) then '0-CHURN'
        else NULL
      end as next_week_churn,
      user_pseudo_id
    from lag_lead_with_diffs
    group by 1,2,3,4
  ) t1
  group by 1,2,3
)
select time_period, this_week_value, sum(total_users) 
  from calculated group by 1,2
union
select time_period+7, '0-CHURN', -1*sum(total_users) 
  from calculated where next_week_churn is not null group by 1,2;