ARG ADAPTER_VERSION=0.7.1
FROM --platform=linux/amd64 public.ecr.aws/awsguru/aws-lambda-adapter:$ADAPTER_VERSION AS build-stage-amd64
FROM --platform=linux/aarch64 public.ecr.aws/awsguru/aws-lambda-adapter:$ADAPTER_VERSION AS build-stage-arm64

FROM public.ecr.aws/amazonlinux/amazonlinux:2023 AS package-stage

RUN mkdir -p /asset/extensions && mkdir -p /asset/libs/x86_64/ && mkdir -p /asset/libs/aarch64/
COPY --from=build-stage-amd64 /lambda-adapter /asset/libs/x86_64/lambda-adapter
COPY --from=build-stage-arm64 /lambda-adapter /asset/libs/aarch64/lambda-adapter
COPY ./bootstrap /asset/bootstrap
COPY ./lambda-adapter /asset/extensions

USER webadapter