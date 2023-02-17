FROM public.ecr.aws/docker/library/node:16.14-stretch-slim AS builder
WORKDIR /app
COPY . .
RUN yarn install
RUN yarn build

FROM public.ecr.aws/docker/library/node:16.14-stretch-slim AS server
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.6.1 /lambda-adapter /opt/extensions/lambda-adapter
WORKDIR /app
COPY . .
RUN yarn install
COPY --from=builder ./app/dist ./dist
EXPOSE 8080
CMD ["npm", "start"]