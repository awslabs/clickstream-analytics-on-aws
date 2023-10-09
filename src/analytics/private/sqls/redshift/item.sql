CREATE TABLE IF NOT EXISTS {{schema}}.{{table_item}}(
    event_timestamp BIGINT,
    id VARCHAR(255),
    properties SUPER
) DISTSTYLE EVEN SORTKEY(id, event_timestamp)