FROM public.ecr.aws/docker/library/node:16
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY ./src ./src
RUN cd src/control-plane/backend/lambda/api && yarn install && yarn build
RUN cd src/control-plane/backend/lambda/api && rm -rf node_modules && yarn install --production

RUN mkdir -p /asset
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/node_modules /asset/
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/dist /asset/
RUN cp -r /home/node/app/src/control-plane/backend/lambda/api/run.sh /asset/run.sh