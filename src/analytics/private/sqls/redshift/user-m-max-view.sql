CREATE MATERIALIZED VIEW {{schema}}.user_m_max_view
BACKUP YES
DISTSTYLE EVEN
SORTKEY (user_pseudo_id, event_timestamp)
AUTO REFRESH NO AS
SELECT  user_pseudo_id
       ,MAX(event_timestamp) AS event_timestamp
FROM {{schema}}.user_v2
GROUP BY  user_pseudo_id;