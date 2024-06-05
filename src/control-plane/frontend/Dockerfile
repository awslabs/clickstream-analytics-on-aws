FROM public.ecr.aws/docker/library/node:20 AS builder
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY frontend frontend
COPY src src
COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY nx.json nx.json
COPY .projenrc.js .projenrc.js
COPY projenrc projenrc
COPY pnpm-workspace.yaml pnpm-workspace.yaml

ARG GENERATE_SOURCEMAP=false
ARG CHUNK_MIN_SIZE=409600
ARG CHUNK_MAX_SIZE=512000
ARG REACT_APP_SOLUTION_VERSION

RUN export GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP} && export CHUNK_MIN_SIZE=${CHUNK_MIN_SIZE} && export CHUNK_MAX_SIZE=${CHUNK_MAX_SIZE}
RUN npm install -g pnpm@8.15.3
RUN pnpm install
RUN pnpm projen
RUN pnpm nx build @aws/clickstream-base-lib

WORKDIR /home/node/app/frontend
ENV REACT_APP_SOLUTION_VERSION=$REACT_APP_SOLUTION_VERSION
RUN pnpm install
RUN pnpm run crabuild

WORKDIR /home/node/app/frontend/serve
RUN npm install -g @vercel/ncc@0.38.1
RUN npm install && npm run ncc-build

FROM --platform=linux/aarch64 public.ecr.aws/docker/library/node:20
COPY --from=builder /home/node/app/frontend/run.sh /asset/run.sh
COPY --from=builder /home/node/app/frontend/serve/ncc /asset/
COPY --from=builder /home/node/app/frontend/build/ /asset/public

USER node