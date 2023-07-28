ARG TARGET_PLATFORM=linux/amd64
ARG ADAPTER_VERSION=0.7.0
FROM --platform=$TARGET_PLATFORM public.ecr.aws/awsguru/aws-lambda-adapter:$ADAPTER_VERSION as build-stage

FROM public.ecr.aws/amazonlinux/amazonlinux:2 as package-stage
RUN mkdir -p /asset/extensions
COPY --from=build-stage /lambda-adapter /asset/extensions/lambda-adapter
COPY ./bootstrap /asset/bootstrap