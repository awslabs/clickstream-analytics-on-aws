CREATE OR REPLACE VIEW {{database_name}}.{{schema}}.{{viewName}}
AS
WITH total_users AS (
  SELECT
    first_date,
    COUNT(user_pseudo_id) AS total_users
  FROM (
    SELECT
      first_date,
      user_pseudo_id
    FROM {{database_name}}.{{schema}}.clickstream_retention_base_view
    GROUP BY 1, 2
  ) t2
  GROUP BY 1
),

retention_counts AS (
  SELECT
    first_date,
    day_diff,
    COUNT(distinct user_pseudo_id) AS returned_user_count
  FROM {{database_name}}.{{schema}}.clickstream_retention_base_view
  GROUP BY first_date, day_diff
)

SELECT
  rc.first_date,
  rc.day_diff,
  rc.returned_user_count,
  tu.total_users
FROM retention_counts rc
JOIN total_users tu USING (first_date);
