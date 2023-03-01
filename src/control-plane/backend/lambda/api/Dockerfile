FROM public.ecr.aws/docker/library/node:16 AS builder
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY . .
RUN yarn install && yarn build


FROM public.ecr.aws/docker/library/node:16.14-stretch-slim AS server
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.6.1 /lambda-adapter /opt/extensions/lambda-adapter
COPY --from=builder /home/node/app/node_modules ./node_modules
COPY --from=builder /home/node/app/dist ./dist
EXPOSE 8080
USER node
CMD ["node", "dist/index.js"]