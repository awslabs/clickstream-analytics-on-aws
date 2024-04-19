#!/bin/bash

# This script is used to run server in local environment.

helpFunction()
{
   echo ""
   echo "SYNOPSIS"
   echo "      start.sh [<Options> ...]"
   echo ""
   echo "Usage: $0 -s <server-type> -profile <AWS profile> -region <AWS region> -stack <Control plane stack name>"
   echo -e "\t-s: Server Type (backend | frontend), default value is backend"
   echo -e "\t-p: AWS Profile, default value is default"
   echo -e "\t-r: AWS Region, default value is us-east-1"
   echo -e "\t-n: Control Plane Stack Name, default value is cloudfront-s3-control-plane-stack-global"
   exit 1 # Exit script after printing help
}

# Set the options of this bash script
while getopts "s:p:r:n:" opt
do
   case "$opt" in
      s ) server="$OPTARG" ;;
      p ) profile="$OPTARG" ;;
      r ) region="$OPTARG" ;;
      n ) stack="$OPTARG" ;;
      ? ) helpFunction ;;
   esac
done

# Set parameters default values
if [ -z "$server" ]
then
   server=backend
fi
if [ -z "$profile" ]
then
   profile=default
fi
if [ -z "$region" ]
then
   region=us-east-1
fi
if [ -z "$stack" ]
then
   stack=cloudfront-s3-control-plane-stack-global
fi

# Begin script in case all parameters are correct
echo "Server Type: $server"
echo "AWS_PROFILE: $profile"
echo "AWS_REGION: $region"
echo "Control Plane Stack Name: $stack"

export AWS_PROFILE=$profile
export AWS_REGION=$region
export CONTROL_PLANE_STACK_NAME=$stack

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


