FROM public.ecr.aws/docker/library/node:18 AS builder
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY frontend .
# copy the content of symbol link
COPY frontend/src/ts/constant-ln.ts src/ts/constant-ln.ts 
COPY frontend/src/ts/explore-types-ln.ts src/ts/explore-types-ln.ts 
ARG GENERATE_SOURCEMAP=false
ARG CHUNK_MIN_SIZE=102400
ARG CHUNK_MAX_SIZE=204800
RUN export GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP} && export CHUNK_MIN_SIZE=${CHUNK_MIN_SIZE} && export CHUNK_MAX_SIZE=${CHUNK_MAX_SIZE} && yarn install && yarn run crabuild

FROM public.ecr.aws/docker/library/nginx:1.22
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.6.1	/lambda-adapter /opt/extensions/lambda-adapter
COPY --from=builder /home/node/app/build/ /usr/share/nginx/public/
COPY src/control-plane/frontend/config/ /etc/nginx/
USER nginx
CMD ["nginx", "-g", "daemon off;"]