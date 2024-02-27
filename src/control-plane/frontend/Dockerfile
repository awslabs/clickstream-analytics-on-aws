FROM public.ecr.aws/docker/library/node:18 AS builder
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY . .

ARG GENERATE_SOURCEMAP=false
ARG CHUNK_MIN_SIZE=819200
ARG CHUNK_MAX_SIZE=1024000

RUN export GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP} && export CHUNK_MIN_SIZE=${CHUNK_MIN_SIZE} && export CHUNK_MAX_SIZE=${CHUNK_MAX_SIZE}
RUN npm install -g pnpm@8.15.3
RUN pnpm install
RUN pnpm projen
RUN pnpm nx build @aws/clickstream-base-lib

WORKDIR /home/node/app/frontend
RUN pnpm install
RUN pnpm run crabuild

FROM public.ecr.aws/docker/library/nginx:1.22
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.6.1	/lambda-adapter /opt/extensions/lambda-adapter
COPY --from=builder /home/node/app/build/ /usr/share/nginx/public/
COPY src/control-plane/frontend/config/ /etc/nginx/
USER nginx
CMD ["nginx", "-g", "daemon off;"]