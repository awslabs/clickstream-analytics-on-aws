#!/usr/bin/env bash
set -euxo pipefail

export BSS_IMAGE_ASSET_REPOSITORY_NAME=clickstream
export AWS_ASSET_ACCOUNT_ID=123456789012
export AWS_CN_ASSET_ACCOUNT_ID=0123456789012
export REGIONS='us-west-1,us-west-2'
export AWS_ASSET_PUBLISH_ROLE='arn:aws:iam::123456789012:role/cross-account-publishing-role'
export BUILD_VERSION=ci-latest 
export GLOBAL_ASSETS='default/'
export CN_ASSETS='cn/'
export TARGET='feature-rel/test'
./deployment/build-dist.sh solution-bucket clickstream $BUILD_VERSION