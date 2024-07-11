#!/usr/bin/env bash

set -euxo pipefail

export SOLUTION_NAME='test-clickstream-001'
export BUILD_VERSION=ci-latest-001
export PUBLIC_ECR_TAG=1.2.0-dev
export PUBLIC_ECR_REGISTRY='public.ecr.aws/testid'
# in global pipeline
export CODEBUILD_SRC_DIR=`pwd`
cd deployment/
export IS_IN_GCR_PIPELINE=0
export DIST_OUTPUT_BUCKET='aws-test-solutions'
./build-s3-dist.sh solution-bucket $SOLUTION_NAME $BUILD_VERSION
source ./solution_config
export SOLUTION_ID
export SOLUTION_NAME
export SOLUTION_TRADEMARKEDNAME
export SOLUTION_ECR_BUILD_VERSION
export SOLUTION_ECR_ACCOUNT
export SOLUTION_ECR_REPO_NAME
export PUBLIC_ECR_REGISTRY
export PUBLIC_ECR_TAG 
node ./test/index.js
