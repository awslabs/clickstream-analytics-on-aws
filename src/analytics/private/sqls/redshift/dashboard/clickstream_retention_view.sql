CREATE MATERIALIZED VIEW {{schema}}.clickstream_retention_view
BACKUP NO
SORTKEY(first_date)
AUTO REFRESH YES
AS
WITH user_first_date AS (
  SELECT
    user_pseudo_id,
    min(event_date) as first_date
  FROM {{schema}}.event
  GROUP BY user_pseudo_id
),

retention_data AS (
SELECT
    user_pseudo_id,
    first_date,
    DATE_DIFF('day', first_date, event_date) AS day_diff
  FROM {{schema}}.event
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
FROM retention_rate;