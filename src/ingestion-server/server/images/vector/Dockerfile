ARG PLATFORM_ARG
FROM --platform=$PLATFORM_ARG timberio/vector:0.34.1-debian

ENV AWS_REGION='__NOT_SET__'
ENV AWS_MSK_BROKERS='__NOT_SET__'
ENV AWS_MSK_TOPIC='__NOT_SET__'
ENV AWS_S3_BUCKET='__NOT_SET__'
ENV AWS_S3_PREFIX='s3-data'
ENV S3_BATCH_MAX_BYTES=30000000
ENV S3_BATCH_TIMEOUT_SECS=300
ENV AWS_KINESIS_STREAM_NAME='__NOT_SET__'

ENV VECTOR_REQUIRE_HEALTHY='false'
ENV STREAM_ACK_ENABLE='true'
ENV WORKER_THREADS_NUM='-1'

COPY ./config/vector*.toml /etc/vector/
COPY ./config/entrypoint.sh /

RUN groupadd -r vector && useradd -r -g vector vector

RUN chown vector /entrypoint.sh \
    && chown -R vector /etc/vector \
    && chown -R vector /var/lib/vector
RUN chmod u+x /entrypoint.sh && chmod u+wr /etc/vector/*.toml

USER vector

ENTRYPOINT [ "/entrypoint.sh" ]
