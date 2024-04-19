ARG PLATFORM_ARG
FROM --platform=$PLATFORM_ARG public.ecr.aws/docker/library/nginx:1.24

# default nginx path
ENV SERVER_ENDPOINT_PATH='/collect'
ENV PING_ENDPOINT_PATH='/ping'
ENV SERVER_CORS_ORIGIN='*'
ENV NGINX_WORKER_CONNECTIONS='1024'

COPY ./config/nginx.conf /etc/nginx/nginx.conf
COPY ./config/docker-entrypoint.sh /

RUN rm -rf /etc/nginx/conf.d/default.conf

RUN chown -R nginx /etc/nginx \
    && chown -R nginx /docker-entrypoint.d \
    && chown -R nginx /usr/share/nginx \
    && chown -R nginx /run \
    && chown -R nginx /var/cache/nginx \
    && chown nginx ./docker-entrypoint.sh
RUN chmod u+x ./docker-entrypoint.sh && chmod u+rw /etc/nginx/nginx.conf

USER nginx

HEALTHCHECK --interval=2m --timeout=5s \
  CMD curl -f http://127.0.0.1:8088/health || exit 1

EXPOSE 8088
