ARG PLATFORM_ARG
FROM --platform=$PLATFORM_ARG timberio/vector:0.25.1-alpine

ENV AWS_REGION='__NOT_SET__'
ENV AWS_MSK_BROKERS='__NOT_SET__'
ENV AWS_MSK_TOPIC='__NOT_SET__'

ENV VECTOR_REQUIRE_HEALTHY='false'
ENV STREAM_ACK_ENABLE='true'
ENV WORKER_THREADS_NUM='-1'

COPY ./config/vector*.toml /etc/vector/
COPY ./config/entrypoint.sh /

RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]
