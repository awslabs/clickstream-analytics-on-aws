SELECT
    window_start,
    window_end,
    ''eventAndUserCount'' as data_type,
    COUNT(eventId) AS event_count,
    COUNT(distinct userPseudoId) AS user_count,
    CAST(NULL AS INTEGER) as top_rank,
    CAST(NULL AS VARCHAR) as property_name,
    CAST(NULL AS VARCHAR) as property_value
FROM TABLE(
            {3}(
                TABLE {0},
                DESCRIPTOR(event_time),
                INTERVAL ''{1}'' MINUTES,
                INTERVAL ''{2}'' MINUTES
            )
        )
GROUP BY window_start, window_end
