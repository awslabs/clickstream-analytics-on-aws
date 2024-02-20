FROM public.ecr.aws/docker/library/node:18
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY ./src ./src
RUN npm install -g pnpm
RUN cd src/control-plane/backend/lambda/api && pnpm install && pnpm run compile
RUN cd src/control-plane/backend/lambda/api && rm -rf node_modules && pnpm install --prod
RUN rm -rf /home/node/app/src/control-plane/backend/lambda/api/dist/test && \
curl -sf https://gobinaries.com/tj/node-prune | sh && \
node-prune /home/node/app/src/control-plane/backend/lambda/api/node_modules

RUN mkdir -p /home/node/app/src/control-plane/backend/lambda/api/dist/service/quicksight/
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/service/quicksight/templates /home/node/app/src/control-plane/backend/lambda/api/dist/service/quicksight/
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/locales /home/node/app/src/control-plane/backend/lambda/api/dist/locales/


RUN mkdir -p /asset
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/node_modules /asset/
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/dist /asset/
RUN cp /home/node/app/src/control-plane/backend/lambda/api/run.sh /asset/run.sh
USER node