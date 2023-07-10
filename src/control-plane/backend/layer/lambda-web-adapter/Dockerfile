ARG TARGET_PLATFORM=linux/amd64
FROM --platform=$TARGET_PLATFORM public.ecr.aws/amazonlinux/amazonlinux:2 as build-stage
ARG ARCH=x86_64
RUN rpm --rebuilddb && yum install -y yum-plugin-ovl jq
RUN yum groupinstall -y "Development tools"
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN source $HOME/.cargo/env && rustup target add ${ARCH}-unknown-linux-musl
RUN curl -k -o /${ARCH}-linux-musl-cross.tgz https://musl.cc/${ARCH}-linux-musl-cross.tgz \
        && tar zxf /${ARCH}-linux-musl-cross.tgz \
        && ln -s /${ARCH}-linux-musl-cross/bin/${ARCH}-linux-musl-gcc /usr/local/bin/${ARCH}-unknown-linux-musl-gcc
WORKDIR /app
RUN git clone https://github.com/awslabs/aws-lambda-web-adapter.git &&\
    cd aws-lambda-web-adapter &&\
    source $HOME/.cargo/env &&\
    LAMBDA_RUNTIME_USER_AGENT=aws-lambda-rust/aws-lambda-adapter/$(cargo metadata --no-deps --format-version=1 | jq -r '.packages[0].version') \
    CC=${ARCH}-unknown-linux-musl-gcc cargo build --release --target=${ARCH}-unknown-linux-musl

FROM public.ecr.aws/amazonlinux/amazonlinux:2 as  package-stage
ARG ARCH=x86_64
RUN mkdir -p /asset/extensions
COPY --from=build-stage /app/aws-lambda-web-adapter/target/${ARCH}-unknown-linux-musl/release/lambda-adapter /asset/extensions/lambda-adapter
COPY --from=build-stage /app/aws-lambda-web-adapter/layer/* /asset/
