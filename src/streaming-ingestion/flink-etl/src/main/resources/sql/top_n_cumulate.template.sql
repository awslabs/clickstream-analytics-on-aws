SELECT
    window_start,
    window_end,
    ''{4}Top{5}Rank'' as data_type,
    event_count,
    user_count,
    rownum as top_rank,
    ''{4}'' as property_name,
    {4} as property_value
  FROM (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY window_start, window_end
               ORDER BY event_count DESC
           ) AS rownum
    FROM (
        SELECT window_start,
               window_end,
               {4},
               COUNT(eventId) AS event_count,
               COUNT(distinct userPseudoId) AS user_count
        FROM TABLE(
            {3}(
                TABLE {0}
                ,DESCRIPTOR(event_time)
                {6},INTERVAL ''{1}'' MINUTES
                ,INTERVAL ''{2}'' MINUTES
            )
        )
        GROUP BY window_start, window_end, {4}
    )
)
WHERE rownum <= {5}
