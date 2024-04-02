FROM public.ecr.aws/docker/library/node:18
RUN mkdir -p /home/node/app
WORKDIR /home/node/app

COPY frontend frontend
ARG REACT_APP_SOLUTION_VERSION
RUN echo "REACT_APP_SOLUTION_VERSION=$REACT_APP_SOLUTION_VERSION" > ./frontend/.env

COPY src src
COPY package.json package.json
COPY pnpm-lock.yaml pnpm-lock.yaml
COPY nx.json nx.json
COPY projenrc projenrc
COPY pnpm-workspace.yaml pnpm-workspace.yaml

RUN npm install -g pnpm@8.15.3 @vercel/ncc@0.38.1
RUN rm -fr node_modules
RUN pnpm install && pnpm nx run-many --target=build
RUN cd src/control-plane/backend/lambda/api && pnpm run ncc-build

RUN mkdir -p /home/node/app/src/control-plane/backend/lambda/api/ncc/quicksight/
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/service/quicksight/templates /home/node/app/src/control-plane/backend/lambda/api/ncc/quicksight/
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/service/quicksight/templates /home/node/app/src/control-plane/backend/lambda/api/ncc/
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/locales /home/node/app/src/control-plane/backend/lambda/api/ncc/locales/
RUN mkdir -p /home/node/app/src/control-plane/backend/lambda/api/ncc/sqls/redshift
RUN cp /home/node/app/src/analytics/private/sqls/redshift/event-v2.sql /home/node/app/src/control-plane/backend/lambda/api/ncc/sqls/redshift/event-v2.sql
RUN cp /home/node/app/src/analytics/private/sqls/redshift/user-v2.sql /home/node/app/src/control-plane/backend/lambda/api/ncc/sqls/redshift/user-v2.sql

RUN mkdir -p /asset
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/ncc /asset/
RUN cp /home/node/app/src/control-plane/backend/lambda/api/run.sh /asset/run.sh
USER node