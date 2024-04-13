#!/bin/sh
CONFIG_FILE="/app/configure.py"

cat $CONFIG_FILE

if [ ! -f "$CONFIG_FILE" ]; then
    echo "config does not exist: $CONFIG_FILE"
    exit 1
fi

sed -i 's/IS_LOG_FULL_REQUEST_MESSAGE = True/IS_LOG_FULL_REQUEST_MESSAGE = False/' $CONFIG_FILE

cat $CONFIG_FILE

# Execute the CMD from the Dockerfile
exec "$@"