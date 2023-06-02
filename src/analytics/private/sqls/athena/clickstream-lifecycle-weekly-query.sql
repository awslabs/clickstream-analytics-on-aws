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