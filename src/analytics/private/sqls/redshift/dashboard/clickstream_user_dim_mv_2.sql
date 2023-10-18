-- recompute refresh
CREATE MATERIALIZED VIEW {{schema}}.clickstream_user_dim_mv_2 
BACKUP NO
SORTKEY(user_pseudo_id)
AUTO REFRESH YES
AS
select user_pseudo_id,
    count
    (distinct user_id) as user_id_count
    from {{schema}}.event
    where event_name not in 
    (
        '_first_open',
        '_first_visit'
    ) group by 1
;