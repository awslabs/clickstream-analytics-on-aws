ARG ADAPTER_VERSION=0.8.2
FROM --platform=linux/amd64 public.ecr.aws/awsguru/aws-lambda-adapter:$ADAPTER_VERSION-x86_64 AS build-stage-amd64
FROM --platform=linux/aarch64 public.ecr.aws/awsguru/aws-lambda-adapter:$ADAPTER_VERSION-aarch64 AS build-stage-arm64

FROM public.ecr.aws/amazonlinux/amazonlinux:2023 AS package-stage

RUN mkdir -p /asset/extensions && mkdir -p /asset/libs/x86_64/ && mkdir -p /asset/libs/aarch64/
COPY --from=build-stage-amd64 /lambda-adapter /asset/libs/x86_64/lambda-adapter
COPY --from=build-stage-arm64 /lambda-adapter /asset/libs/aarch64/lambda-adapter

ARG CHECKSUMAMD64="65749c40818300404daeaeab91ae4365"
RUN echo "${CHECKSUMAMD64} /asset/libs/x86_64/lambda-adapter" | md5sum -c -
ARG CHECKSUMARM64="cac890226f19b7232842008588faf72d"
RUN echo "${CHECKSUMARM64} /asset/libs/aarch64/lambda-adapter" | md5sum -c -

COPY ./bootstrap /asset/bootstrap
COPY ./lambda-adapter /asset/extensions

USER webadapter