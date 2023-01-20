#!/bin/sh
# vim:sw=4:ts=4:et

export RUST_BACKTRACE=full

toml_files="/etc/vector/vector-global.toml /etc/vector/vector.toml"

echo "AWS_REGION: $AWS_REGION"
echo "AWS_S3_BUCKET: $AWS_S3_BUCKET"
echo "AWS_S3_PREFIX: $AWS_S3_PREFIX"
echo "AWS_MSK_BROKERS: $AWS_MSK_BROKERS"
echo "AWS_MSK_TOPIC: $AWS_MSK_TOPIC"
echo "AWS_KINESIS_STREAM_NAME: $AWS_KINESIS_STREAM_NAME"
echo "STREAM_ACK_ENABLE: $STREAM_ACK_ENABLE"
echo "VECTOR_REQUIRE_HEALTHY: $VECTOR_REQUIRE_HEALTHY"
echo "WORKER_THREADS_NUM: $WORKER_THREADS_NUM"

batch_or_ack="batch"
if [ $STREAM_ACK_ENABLE == 'true' ];
then 
   batch_or_ack="ack"
fi

VECTOR_THREADS_OPT="--threads ${WORKER_THREADS_NUM}"

if [ $WORKER_THREADS_NUM == '-1' ];
then
  VECTOR_THREADS_OPT=''
fi 

msk_config_file=/etc/vector/vector-msk-${batch_or_ack}.toml

if [ $AWS_MSK_BROKERS != '__NOT_SET__' ] && [ -f ${msk_config_file} ];
then
   sed -i "s#%%AWS_REGION%%#$AWS_REGION#g; s#%%AWS_MSK_BROKERS%%#$AWS_MSK_BROKERS#g; s#%%AWS_MSK_TOPIC%%#$AWS_MSK_TOPIC#g;" ${msk_config_file}
   toml_files="${toml_files} ${msk_config_file}"
fi 


echo "/usr/local/bin/vector validate ${toml_files}"
/usr/local/bin/vector validate ${toml_files}

configs=$(echo $toml_files | sed "s#/etc/#--config /etc/#g")

echo "/usr/local/bin/vector ${configs} --require-healthy $VECTOR_REQUIRE_HEALTHY ${VECTOR_THREADS_OPT}"
/usr/local/bin/vector ${configs} --require-healthy $VECTOR_REQUIRE_HEALTHY ${VECTOR_THREADS_OPT}


