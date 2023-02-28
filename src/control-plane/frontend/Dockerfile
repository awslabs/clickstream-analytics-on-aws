FROM public.ecr.aws/docker/library/node:16 AS builder
RUN mkdir -p /home/node/app
WORKDIR /home/node/app
COPY frontend .
RUN npm install && npm run build

FROM public.ecr.aws/docker/library/nginx:1.22
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.6.1	/lambda-adapter /opt/extensions/lambda-adapter
COPY --from=builder /home/node/app/build/ /usr/share/nginx/public/
COPY src/control-plane/frontend/config/ /etc/nginx/
USER nginx
CMD ["nginx", "-g", "daemon off;"]