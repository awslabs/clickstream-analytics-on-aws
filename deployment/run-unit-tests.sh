#!/usr/bin/env bash

set -euxo pipefail

rm src/control-plane/backend/lambda/api/common/model-ln.ts 
cp src/common/model.ts src/control-plane/backend/lambda/api/common/model-ln.ts
rm src/control-plane/backend/lambda/api/service/quicksight/dashboard-ln.ts
cp src/reporting/private/dashboard.ts src/control-plane/backend/lambda/api/service/quicksight/dashboard-ln.ts

export CI=true
export JEST_WORKERS=16

echo "pnpm install"
npm install -g pnpm@8.15.3
pnpm install

pnpm projen
pnpm nx run-many --target=build

echo "pnpm run test"
pnpm run test

pnpm install --frozen-lockfile --dir frontend
pnpm --dir frontend run test

# spark-etl
docker run -i --rm -v `pwd`/src/data-pipeline/:/data --workdir /data \
  public.ecr.aws/docker/library/gradle:7.6-jdk17 sh -c 'cd /data/etl-common/ && gradle clean test jacocoAggregatedReport install && cd /data/spark-etl/ && gradle clean test jacocoAggregatedReport'

# flink-etl
docker run -i --rm -v `pwd`/src/:/src --workdir /src \
  public.ecr.aws/docker/library/gradle:7.6-jdk11 sh -c 'cd /src/data-pipeline/etl-common/ && gradle clean test jacocoAggregatedReport install && cd /src/streaming-ingestion/flink-etl/ && gradle clean build jacocoAggregatedReport'
