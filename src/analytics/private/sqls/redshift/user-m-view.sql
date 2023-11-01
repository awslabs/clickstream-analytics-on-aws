CREATE MATERIALIZED VIEW {{schema}}.user_m_view 
BACKUP NO SORTKEY(user_pseudo_id) 
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
       ,platform
       ,user_first_touch_timestamp
       ,user_properties
       ,user_ltv
       ,first_visit_date
       ,first_referer
       ,first_traffic_source_type
       ,first_traffic_medium
       ,first_traffic_source
       ,first_channel
       ,device_id_list
       ,event_timestamp
FROM user_new