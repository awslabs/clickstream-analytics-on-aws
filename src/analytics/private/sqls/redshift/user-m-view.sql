CREATE MATERIALIZED VIEW {{schema}}.user_m_view 
BACKUP YES
SORTKEY(user_pseudo_id) 
AUTO REFRESH YES 
AS
WITH user_pseudo_id_rank AS
(
	SELECT  *
	       ,ROW_NUMBER() over (partition by user_pseudo_id ORDER BY event_timestamp desc) AS et_rank
	FROM {{schema}}.{{table_user}}
), user_new AS
(
	SELECT  *
	FROM user_pseudo_id_rank
	WHERE et_rank = 1
)
SELECT  user_id
       ,user_pseudo_id
       ,user_first_touch_timestamp
       ,user_properties
       ,user_ltv
       ,_first_visit_date
       ,_first_referer
       ,_first_traffic_source_type
       ,_first_traffic_medium
       ,_first_traffic_source
       ,device_id_list
       ,_channel
       ,event_timestamp
FROM user_new