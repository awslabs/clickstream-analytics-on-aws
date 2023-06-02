CREATE TABLE IF NOT EXISTS {{schema}}.{{table_dim_users}}(
  event_date DATE,
  event_timestamp BIGINT,
  user_id VARCHAR(255),
  user_properties SUPER,
  user_pseudo_id VARCHAR(255),
  create_date TIMESTAMP default getdate()
) SORTKEY(user_pseudo_id)