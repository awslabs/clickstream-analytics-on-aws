ARG PLATFORM_ARG
FROM --platform=$PLATFORM_ARG public.ecr.aws/docker/library/nginx:1.22

# default nginx path
ENV SERVER_ENDPOINT_PATH='/collect'
ENV SERVER_CORS_ORIGIN='*'
ENV NGINX_WORKER_CONNECTIONS='1024'

COPY ./config/nginx.conf /etc/nginx/nginx.conf
COPY ./config/docker-entrypoint.sh /

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 8088
