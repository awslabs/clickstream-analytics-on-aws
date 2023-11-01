DROP MATERIALIZED VIEW IF EXISTS {{schema}}.clickstream_user_dim_view;

CREATE OR REPLACE VIEW {{schema}}.clickstream_user_dim_view 
AS
SELECT upid.*,
(
    case when uid.user_id_count>0 then 'Registered' else 'Non-registered' end
) as is_registered
from {{schema}}.clickstream_user_dim_mv_1 as upid left outer join 
{{schema}}.clickstream_user_dim_mv_2 as uid on upid.user_pseudo_id=uid.user_pseudo_id;