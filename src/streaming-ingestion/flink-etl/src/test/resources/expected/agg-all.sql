SELECT window_start, window_end, 'eventAndUserCount' as data_type,
JSON_OBJECT(KEY 'user_count' VALUE COUNT(distinct userPseudoId), KEY 'event_count' VALUE COUNT(eventId)) data
FROM TABLE(
            CUMULATE(
                TABLE testView,
                DESCRIPTOR(event_time),
                INTERVAL '10' MINUTES,
                INTERVAL '60' MINUTES
            )
        )
GROUP BY window_start, window_end

UNION ALL
SELECT window_start, window_end, 'pageTitleTopRank' as data_type,
JSON_OBJECT(KEY 'pageViewPageTitle' VALUE pageViewPageTitle, KEY 'event_count' VALUE event_count, KEY 'user_count' VALUE user_count, KEY 'rank' VALUE rownum) data
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
                TABLE testView,
                DESCRIPTOR(event_time),
                INTERVAL '10' MINUTES,
                INTERVAL '60' MINUTES
            )
        )
        GROUP BY window_start, window_end, pageViewPageTitle
    )
)
WHERE rownum <= 10

UNION ALL
SELECT window_start, window_end, 'eventNameTopRank' as data_type,
JSON_OBJECT(KEY 'eventName' VALUE eventName, KEY 'event_count' VALUE event_count, KEY 'user_count' VALUE user_count, KEY 'rank' VALUE rownum) data
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
                TABLE testView,
                DESCRIPTOR(event_time),
                INTERVAL '10' MINUTES,
                INTERVAL '60' MINUTES
            )
        )
        GROUP BY window_start, window_end, eventName
    )
)
WHERE rownum <= 10

UNION ALL
SELECT window_start, window_end, 'trafficSourceSourceTopRank' as data_type,
JSON_OBJECT(KEY 'trafficSourceSource' VALUE trafficSourceSource, KEY 'event_count' VALUE event_count, KEY 'user_count' VALUE user_count, KEY 'rank' VALUE rownum) data
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
                TABLE testView,
                DESCRIPTOR(event_time),
                INTERVAL '10' MINUTES,
                INTERVAL '60' MINUTES
            )
        )
        GROUP BY window_start, window_end, trafficSourceSource
    )
)
WHERE rownum <= 10