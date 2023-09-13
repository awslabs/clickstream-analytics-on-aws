CREATE MATERIALIZED VIEW {{schema}}.clickstream_ods_events_streaming_mv 
AUTO REFRESH YES AS
SELECT approximate_arrival_timestamp,
partition_key,
shard_id,
sequence_number,
refresh_time,
JSON_PARSE(kinesis_data) as event_data
FROM kds.{{kinesis_data_stream_name}}
WHERE CAN_JSON_PARSE(kinesis_data);