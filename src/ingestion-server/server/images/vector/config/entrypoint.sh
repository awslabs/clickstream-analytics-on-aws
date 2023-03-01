#!/bin/sh
# vim:sw=4:ts=4:et

set -e

export RUST_BACKTRACE=full

toml_files="/etc/vector/vector-global.toml /etc/vector/vector.toml"

echo "AWS_REGION: $AWS_REGION"
echo "AWS_S3_BUCKET: $AWS_S3_BUCKET"
echo "AWS_S3_PREFIX: $AWS_S3_PREFIX"
echo "S3_BATCH_MAX_BYTES: $S3_BATCH_MAX_BYTES"
echo "S3_BATCH_TIMEOUT_SECS: $S3_BATCH_TIMEOUT_SECS"
echo "AWS_MSK_BROKERS: $AWS_MSK_BROKERS"
echo "AWS_MSK_TOPIC: $AWS_MSK_TOPIC"
echo "AWS_KINESIS_STREAM_NAME: $AWS_KINESIS_STREAM_NAME"
echo "STREAM_ACK_ENABLE: $STREAM_ACK_ENABLE"
echo "VECTOR_REQUIRE_HEALTHY: $VECTOR_REQUIRE_HEALTHY"
echo "WORKER_THREADS_NUM: $WORKER_THREADS_NUM"

batch_or_ack="batch"
if [ $STREAM_ACK_ENABLE = 'true' ];
then 
   batch_or_ack="ack"
fi

VECTOR_THREADS_OPT="--threads ${WORKER_THREADS_NUM}"

if [ $WORKER_THREADS_NUM = '-1' ];
then
  VECTOR_THREADS_OPT=''
fi 

msk_config_file=/etc/vector/vector-msk-${batch_or_ack}.toml
s3_config_file=/etc/vector/vector-s3.toml
kinesis_config_file=/etc/vector/vector-kinesis-${batch_or_ack}.toml

if [ $AWS_MSK_BROKERS != '__NOT_SET__' ] && [ -f ${msk_config_file} ];
then
   sed -i "s#%%AWS_REGION%%#$AWS_REGION#g; s#%%AWS_MSK_BROKERS%%#$AWS_MSK_BROKERS#g; s#%%AWS_MSK_TOPIC%%#$AWS_MSK_TOPIC#g;" ${msk_config_file}
   toml_files="${toml_files} ${msk_config_file}"
fi 

if [ $AWS_KINESIS_STREAM_NAME != '__NOT_SET__' ] && [ -f ${kinesis_config_file} ];
then 
   sed -i "s#%%AWS_REGION%%#$AWS_REGION#g; s#%%AWS_KINESIS_STREAM_NAME%%#$AWS_KINESIS_STREAM_NAME#g;" ${kinesis_config_file}
   toml_files="${toml_files} ${kinesis_config_file}"
fi 

if [ $AWS_S3_BUCKET != '__NOT_SET__' ] && [ -f ${s3_config_file} ];
then
   sed -i "s#%%AWS_REGION%%#$AWS_REGION#g; s#%%AWS_S3_BUCKET%%#$AWS_S3_BUCKET#g; \
   s#%%AWS_S3_PREFIX%%#$AWS_S3_PREFIX#g; s#%%S3_BATCH_MAX_BYTES%%#$S3_BATCH_MAX_BYTES#g; \
   s#%%S3_BATCH_TIMEOUT_SECS%%#$S3_BATCH_TIMEOUT_SECS#g;" \
   ${s3_config_file}
   toml_files="${toml_files} ${s3_config_file}"
fi 


echo "vector validate ${toml_files}"
vector validate ${toml_files}

configs=$(echo $toml_files | sed "s#/etc/#--config /etc/#g")

echo "vector ${configs} --require-healthy $VECTOR_REQUIRE_HEALTHY ${VECTOR_THREADS_OPT}"
vector ${configs} --require-healthy $VECTOR_REQUIRE_HEALTHY ${VECTOR_THREADS_OPT}
