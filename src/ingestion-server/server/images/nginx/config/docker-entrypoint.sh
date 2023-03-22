#!/bin/sh
# vim:sw=4:ts=4:et

set -e

if [ -z "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
    exec 3>&1
else
    exec 3>/dev/null
fi

if [ "$1" = "nginx" -o "$1" = "nginx-debug" ]; then
    if /usr/bin/find "/docker-entrypoint.d/" -mindepth 1 -maxdepth 1 -type f -print -quit 2>/dev/null | read v; then
        echo >&3 "$0: /docker-entrypoint.d/ is not empty, will attempt to perform configuration"

        echo >&3 "$0: Looking for shell scripts in /docker-entrypoint.d/"
        find "/docker-entrypoint.d/" -follow -type f -print | sort -V | while read -r f; do
            case "$f" in
                *.sh)
                    if [ -x "$f" ]; then
                        echo >&3 "$0: Launching $f";
                        "$f"
                    else
                        # warn on shell scripts without exec bit
                        echo >&3 "$0: Ignoring $f, not executable";
                    fi
                    ;;
                *) echo >&3 "$0: Ignoring $f";;
            esac
        done

        echo >&3 "$0: Configuration complete; ready for start up"
    else
        echo >&3 "$0: No files found in /docker-entrypoint.d/, skipping configuration"
    fi
fi

echo "SERVER_ENDPOINT_PATH: $SERVER_ENDPOINT_PATH"
echo "NGINX_WORKER_CONNECTIONS: $NGINX_WORKER_CONNECTIONS"
echo "SERVER_CORS_ORIGIN: $SERVER_CORS_ORIGIN"

sed -i "s#%%SERVER_ENDPOINT_PATH%%#$SERVER_ENDPOINT_PATH#g; \
s#%%NGINX_WORKER_CONNECTIONS%%#$NGINX_WORKER_CONNECTIONS#g;" /etc/nginx/nginx.conf

if [ -z "$SERVER_CORS_ORIGIN" ]; then
    sed -i "/%%SERVER_CORS_ORIGIN%%/d" /etc/nginx/nginx.conf
else
    sed -i "s#%%SERVER_CORS_ORIGIN%%#$SERVER_CORS_ORIGIN#g;" /etc/nginx/nginx.conf
fi
exec "$@"
