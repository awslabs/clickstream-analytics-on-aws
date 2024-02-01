#!/bin/bash

export AWS_PROFILE=default
export AWS_REGION=us-east-1
export CONTROL_PLANE_STACK_NAME=<your stack name>

# This script is used to run server in local environment.

if [ $# -ne 1 ]; then
  echo "Usage: $0 <server-type>"
  echo "Example: $0 backend"
  echo "Example for run backend server in local environment: $0 backend"
  exit 1
fi

# get the first options of this bash script
server=$1

# if the server is backend call the backend.sh script
if [ "$server" == "backend" ]; then
  ./backend.sh
  exit 0
fi

# if the server is frontend call the frontend.sh script
if [ "$server" == "frontend" ]; then
  ./frontend.sh
  exit 0
fi


