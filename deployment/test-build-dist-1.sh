#!/usr/bin/env bash

set -euxo pipefail

export SOLUTION_NAME='test-clickstream-001'
export BUILD_VERSION=v1.1.0-ci-latest

export BSS_IMAGE_ASSET_REPOSITORY_NAME=clickstream
export AWS_ASSET_ACCOUNT_ID=555555555555
export AWS_CN_ASSET_ACCOUNT_ID=444455556666
export REGIONS='us-west-1,us-west-2'
export AWS_ASSET_PUBLISH_ROLE='arn:aws:iam::555555555555:role/cross-account-publishing-role'
export GLOBAL_ASSETS='default/'
export CN_ASSETS='cn/'
export TARGET='feature-rel/test'
export OUT_TAG_IMAGE_SHELL_FILE='test-tag-images.sh'

export SOLUTION_ECR_ACCOUNT=$AWS_ASSET_ACCOUNT_ID
export SOLUTION_ECR_REPO_NAME=$SOLUTION_NAME

# in gcr pipeline
export IS_IN_GCR_PIPELINE=1
export DIST_OUTPUT_BUCKET='aws-gcr-solutions'
./deployment/build-s3-dist-1.sh solution-bucket $SOLUTION_NAME $BUILD_VERSION
node ./deployment/test/index.js
