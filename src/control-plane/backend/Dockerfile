FROM public.ecr.aws/docker/library/node:18
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY . .
RUN npm install -g pnpm
RUN rm -fr node_modules
RUN pnpm install
RUN cd src/control-plane/backend/lambda/api && pnpm run compile
RUN rm -fr node_modules
RUN pnpm -F control-plane-api --config.dedupe-peer-dependents=false i --prod
RUN mkdir -p node_modules/@clickstream/base-lib
RUN cp -r src/base-lib/* node_modules/@clickstream/base-lib/
RUN rm -rf /home/node/app/src/control-plane/backend/lambda/api/dist/test && \
curl -sf https://gobinaries.com/tj/node-prune | sh && \
node-prune /home/node/app/node_modules
RUN ls /home/node/app/node_modules
RUN du -h --max-depth=1 | sort -hr
RUN rm -fr /home/node/app/node_modules/@clickstream/base-lib/node_modules
RUN rm -fr /home/node/app/node_modules/.pnpm

RUN mkdir -p /home/node/app/src/control-plane/backend/lambda/api/dist/service/quicksight/
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/service/quicksight/templates /home/node/app/src/control-plane/backend/lambda/api/dist/service/quicksight/
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/locales /home/node/app/src/control-plane/backend/lambda/api/dist/locales/


RUN mkdir -p /asset
RUN cp -r /home/node/app/node_modules /asset/
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/dist /asset/
RUN cp /home/node/app/src/control-plane/backend/lambda/api/run.sh /asset/run.sh
USER node