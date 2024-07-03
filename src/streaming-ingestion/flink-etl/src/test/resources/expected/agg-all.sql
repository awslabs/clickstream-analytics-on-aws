SELECT
    window_start,
    window_end,
    'eventAndUserCount' as data_type,
    COUNT(eventId) AS event_count,
    COUNT(distinct userPseudoId) AS user_count,
    CAST(NULL AS INTEGER) as top_rank,
    CAST(NULL AS VARCHAR) as property_name,
    CAST(NULL AS VARCHAR) as property_value
FROM TABLE(
            CUMULATE(
                TABLE testView
                ,DESCRIPTOR(event_time)
                ,INTERVAL '10' MINUTES
                ,INTERVAL '60' MINUTES
            )
        )
GROUP BY window_start, window_end

UNION ALL

SELECT
    window_start,
    window_end,
    'newUser' as data_type,
    CAST(NULL AS BIGINT) AS event_count,
    COUNT(distinct userPseudoId) AS user_count,
    CAST(NULL AS INTEGER) as top_rank,
    CAST(NULL AS VARCHAR) as property_name,
    CAST(NULL AS VARCHAR) as property_value
FROM TABLE(
            CUMULATE(
                TABLE testView
                ,DESCRIPTOR(event_time)
                ,INTERVAL '10' MINUTES
                ,INTERVAL '60' MINUTES
            )
        )
WHERE eventName IN ('_first_open', '_first_visit')
GROUP BY window_start, window_end

UNION ALL
SELECT
    window_start,
    window_end,
    'pageViewPageTitleTop10Rank' as data_type,
    event_count,
    user_count,
    rownum as top_rank,
    'pageViewPageTitle' as property_name,
    pageViewPageTitle as property_value
  FROM (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY window_start, window_end
               ORDER BY event_count DESC
           ) AS rownum
    FROM (
        SELECT window_start,
               window_end,
               pageViewPageTitle,
               COUNT(eventId) AS event_count,
               COUNT(distinct userPseudoId) AS user_count
        FROM TABLE(
            CUMULATE(
                TABLE testView
                ,DESCRIPTOR(event_time)
                ,INTERVAL '10' MINUTES
                ,INTERVAL '60' MINUTES
            )
        )
        GROUP BY window_start, window_end, pageViewPageTitle
    )
)
WHERE rownum <= 10
UNION ALL
SELECT
    window_start,
    window_end,
    'eventNameTop10Rank' as data_type,
    event_count,
    user_count,
    rownum as top_rank,
    'eventName' as property_name,
    eventName as property_value
  FROM (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY window_start, window_end
               ORDER BY event_count DESC
           ) AS rownum
    FROM (
        SELECT window_start,
               window_end,
               eventName,
               COUNT(eventId) AS event_count,
               COUNT(distinct userPseudoId) AS user_count
        FROM TABLE(
            CUMULATE(
                TABLE testView
                ,DESCRIPTOR(event_time)
                ,INTERVAL '10' MINUTES
                ,INTERVAL '60' MINUTES
            )
        )
        GROUP BY window_start, window_end, eventName
    )
)
WHERE rownum <= 10
UNION ALL
SELECT
    window_start,
    window_end,
    'trafficSourceSourceTop10Rank' as data_type,
    event_count,
    user_count,
    rownum as top_rank,
    'trafficSourceSource' as property_name,
    trafficSourceSource as property_value
  FROM (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY window_start, window_end
               ORDER BY event_count DESC
           ) AS rownum
    FROM (
        SELECT window_start,
               window_end,
               trafficSourceSource,
               COUNT(eventId) AS event_count,
               COUNT(distinct userPseudoId) AS user_count
        FROM TABLE(
            CUMULATE(
                TABLE testView
                ,DESCRIPTOR(event_time)
                ,INTERVAL '10' MINUTES
                ,INTERVAL '60' MINUTES
            )
        )
        GROUP BY window_start, window_end, trafficSourceSource
    )
)
WHERE rownum <= 10