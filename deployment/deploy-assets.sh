#!/bin/bash
######################################################################################################################
#  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                #
#                                                                                                                    #
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    #
#  with the License. A copy of the License is located at                                                             #
#                                                                                                                    #
#      http://www.apache.org/licenses/LICENSE-2.0                                                                    #
#                                                                                                                    #
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES #
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    #
#  and limitations under the License.                                                                                #
######################################################################################################################

usage() {
    echo "Usage: $0 TEMPLATE_OUTPUT_BUCKET BUILD_OUTPUT_BUCKET SOLUTION_NAME VERSION [PROFILE] [REGION]"
    echo "Please provide template bucket, build bucket, solution name, and version. Profile and region are optional."
    echo "Example: ./deploy-assets.sh clickstream-templates clickstream-templates-us-east-1 my-solution v1.3.0 default us-east-1"
    exit 1
}

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
    usage
fi

export TEMPLATE_OUTPUT_BUCKET="$1"
export BUILD_OUTPUT_BUCKET="$2"
export SOLUTION_NAME="$3"
export VERSION="$4"
export AWS_PROFILE="${5:-default}"
export AWS_REGION="${6:-us-east-1}"

echo "Copying assets to output bucket `date` in `pwd`"
echo "Using AWS Profile: $AWS_PROFILE in region: $AWS_REGION"
echo "Copying CF templates to /$TEMPLATE_OUTPUT_BUCKET/"
aws s3 cp global-s3-assets/  s3://$TEMPLATE_OUTPUT_BUCKET/$SOLUTION_NAME/$VERSION/ --recursive --acl bucket-owner-full-control --profile $AWS_PROFILE --region $AWS_REGION
echo "Copying assets to /$BUILD_OUTPUT_BUCKET/"
aws s3 cp regional-s3-assets/ s3://$BUILD_OUTPUT_BUCKET/$SOLUTION_NAME/$VERSION/ --recursive --acl bucket-owner-full-control --profile $AWS_PROFILE --region $AWS_REGION

echo "Copying assets to output bucket complete `date`"
