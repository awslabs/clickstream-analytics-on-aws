CREATE MATERIALIZED VIEW {{schema}}.clickstream_user_attr_view
BACKUP NO
SORTKEY(user_pseudo_id)
AUTO REFRESH YES
AS
select 
user_pseudo_id
, user_id
, eu.key::varchar as custom_attr_key
, coalesce (nullif(eu.value.string_value::varchar,'')
    , nullif(eu.value.int_value::varchar,'')
    , nullif(eu.value.float_value::varchar,'')
    , nullif(eu.value.double_value::varchar,'')) as custom_attr_value
from {{schema}}.dim_users u, u.user_properties eu;