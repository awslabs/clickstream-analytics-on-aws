with base as (
  select 
    *
  from {{database}}.{{eventTable}}
  where partition_app = ? 
    and partition_year >= ?
    and partition_month >= ?
    and partition_day >= ?
),
user_first_date AS (
  SELECT
    user_pseudo_id,
    min(event_date) as first_date
  FROM base
  GROUP BY user_pseudo_id
),

retention_data AS (
SELECT
    user_pseudo_id,
    first_date,
    DATE_DIFF('day', first_date, event_date) AS day_diff
  FROM base
  JOIN user_first_date USING (user_pseudo_id)
),

retention_counts AS (
  SELECT
    first_date,
    day_diff,
    COUNT(DISTINCT user_pseudo_id) AS returned_user_count
  FROM retention_data
  WHERE day_diff <= 42 -- Calculate retention rate for the last 42 days
  GROUP BY first_date, day_diff
),

total_users AS (
  SELECT
    first_date,
    COUNT(DISTINCT user_pseudo_id) AS total_users
  FROM user_first_date
  group by 1
),

retention_rate AS (
  SELECT
    first_date,
    day_diff,
    returned_user_count,
    total_users
  FROM retention_counts join total_users using(first_date)
)

SELECT
*
FROM retention_rate