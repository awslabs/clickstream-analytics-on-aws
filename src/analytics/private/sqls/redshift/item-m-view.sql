CREATE MATERIALIZED VIEW {{schema}}.item_m_view 
BACKUP YES
SORTKEY(id) 
AUTO REFRESH YES 
AS
WITH item_id_rank AS
(
	SELECT  *
	       ,ROW_NUMBER() over ( partition by id ORDER BY event_timestamp desc ) AS et_rank
	FROM {{schema}}.{{table_item}}
), item_new AS
(
	SELECT  *
	FROM item_id_rank
	WHERE et_rank = 1 
)
SELECT  id
       ,properties
       ,event_timestamp
FROM item_new