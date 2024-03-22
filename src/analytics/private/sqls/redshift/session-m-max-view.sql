CREATE MATERIALIZED VIEW {{schema}}.session_m_max_view
BACKUP YES
DISTSTYLE EVEN
SORTKEY (user_pseudo_id, session_id, event_timestamp)
AUTO REFRESH NO
AS
SELECT  user_pseudo_id
       ,session_id
       ,MAX(event_timestamp) AS event_timestamp
FROM {{schema}}.session
GROUP BY  user_pseudo_id
         ,session_id;
