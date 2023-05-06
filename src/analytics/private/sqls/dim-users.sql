CREATE TABLE IF NOT EXISTS {{schema}}.{{table_dim_users}}(
  event_timestamp BIGINT,
  user_id VARCHAR(255),
  user_properties SUPER,
  user_pseudo_id VARCHAR(255),
  create_date TIMESTAMP default getdate()
) sortkey(user_pseudo_id, event_timestamp)