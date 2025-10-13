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

# Enable debug mode to print each command as it is executed
# set -x
set -e

# This script deploys the Clickstream Analytics on AWS solution.
# Main deployment script for Clickstream Analytics on AWS solution
# This script handles the end-to-end deployment process including:
# - Dependency checks
# - Environment setup
# - Infrastructure provisioning
# - Asset deployment
# - Docker image publishing
# - CloudFormation template deployment
# Usage: ./solution-deploy.sh -r <region> -p <profile> -e <email> [-n <solution_name>] [-v <version>] [--platform <platform>] [-b <bucket>] [--build] [--docker-build] [--deploy-assets] [--template-deploy] [--clean]
# Example: # sh solution-deploy.sh --region us-east-1 --profile default --email imgeo@amazon.com
# Note: This script should be run from the deployment directory of the Clickstream Analytics on AWS solution.

# ===== RESTORE FILES FUNCTION =====
# Function to restore configuration files to original state
restore_files() {
    echo "Restoring solution_config..." && \
    mv ./solution_config.bak ./solution_config 2>/dev/null || true

    # Restore dictionary configuration 
    echo "Restoring dictionary.json..."
    git restore ../src/control-plane/backend/lambda/api/config/dictionary.json 2>/dev/null || true

    # remove tag-images.sh
    echo "Removing tag-images.sh..."
    rm -f ./tag-images.sh 2>/dev/null || true
}

# ===== DEPENDENCY CHECKS =====
# Verify that required tools are installed before proceeding

# Check for AWS CDK installation
# CDK is needed for infrastructure deployment
if ! command -v cdk &> /dev/null
then
    echo "AWS CDK is not installed. Please install it and configure it."
    exit 1
fi

# Check for Node.js installation
# Node.js is required for running build scripts and CDK
if ! command -v node &> /dev/null
then
    echo "Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

# Check for npm installation
if ! command -v npm &> /dev/null
then
    echo "npm is not installed. Please install Node.js and npm and try again."
    exit 1
fi

# Check for Docker installation
# Docker is needed for container image builds
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed. Please install Docker and try again."
    exit 1
fi

# Check for pnpm installation
if ! command -v pnpm &> /dev/null
then
    WARNING: echo "pnpm is not installed. Installing pnpm globally..."
    npm install -g pnpm@9.15.3
    echo "pnpm installed successfully."   
fi

# Clean Node cache to prevent stale dependencies
echo "Cleaning Node Cache..."
rm -rf /home/node/.cache/  2>/dev/null || true

# Remove existing pnpm lock file if it exists
echo "Removing existing pnpm lock file..."
rm -f ../pnpm-lock.yaml  2>/dev/null || true

echo "Removing tag-images.sh..."
rm -f ./tag-images.sh  2>/dev/null || true

# Remove cdk.out directory if it exists
echo "Removing cdk.out directory..."
rm -rf ../cdk.out  2>/dev/null || true

# Remove staging folder
echo "Removing staging folder..."
rm -rf ./staging 2>/dev/null || true

# Restore files from backup
echo "Restoring files from backup..."
restore_files

# ===== ENVIRONMENT SETUP =====
# Configure deployment parameters and environment variables

echo "Setting environment variables..."
# Function to display usage
usage() {
    echo "Usage: $0 [-r REGION] [-p PROFILE] [-e EMAIL] [-n SOLUTION_NAME] [-v VERSION] [-b BUCKET]"
    echo "  -r, --region         AWS Region (Required)"
    echo "  -p, --profile        AWS Profile (Required)" 
    echo "  -e, --email          Email address (Required)"
    echo "  -n, --solution-name  Solution name (Default: clickstream-analytics-on-aws)"
    echo "  -v, --version        Solution version (Default: gets from ./solution-version file)"
    echo "      --platform       Platform to build for (Default: linux/amd64)"
    echo "  -b, --bucket         Base bucket name (Default: clickstream-templates-random-uuid), bucket will be created if it does not exist and reused in future runs. 
                          If you want to use a different bucket, please specify it here."
    echo "      --build          Only build solution artifacts"
    echo "      --docker-build   Only build Docker images"
    echo "      --deploy-assets  Only deploy solution artifacts"
    echo "      --template-deploy Only deploy solution artifacts"
    echo "      --clean          Clean solution artifacts"
    echo "If neither --build nor --deploy is specified, both actions will be performed"
    echo "  -h, --help           Display this help message"
    exit 1
}

# Default values
export TZ=UTC # Set timezone to UTC
SOLUTION_NAME="clickstream-analytics-on-aws"
VERSION=$(cat ./solution-version)
DEFAULT_BUILD_PLATFORM="linux/amd64"
BUILD_ONLY=false
CLEAN_ONLY=false
DEPLOY_ASSET_ONLY=false 
TEMPLATE_DEPLOY_ONLY=false
DOCKER_BUILD_ONLY=false

# If tmp file exists, read bucket name from it, otherwise create new one and save it
if [ -f /tmp/clickstream-bucket-name ]; then
    SOLUTION_BUCKET=$(cat /tmp/clickstream-bucket-name)
else
    SOLUTION_BUCKET="clickstream-templates-$(uuidgen | tr '[:upper:]' '[:lower:]' | rev | cut -c 1-8 | rev)"
    echo "$SOLUTION_BUCKET" > /tmp/clickstream-bucket-name
fi

# Parse command line arguments
parse_args() {
    while getopts ":r:p:e:n:v:b:h-:" opt; do
        case $opt in
            -)
                case "${OPTARG}" in
                    region)
                        AWS_REGION="${!OPTIND}"; OPTIND=$(( $OPTIND + 1 ))
                        ;;
                    profile) 
                        AWS_DEFAULT_PROFILE="${!OPTIND}"; OPTIND=$(( $OPTIND + 1 ))
                        ;;
                    email)
                        EMAIL="${!OPTIND}"; OPTIND=$(( $OPTIND + 1 ))
                        ;;
                    build)
                        BUILD_ONLY=true
                        ;;
                    docker-build)
                        DOCKER_BUILD_ONLY=true
                        ;;
                    deploy-assets)
                        DEPLOY_ASSET_ONLY=true
                        ;;
                    template-deploy)
                        TEMPLATE_DEPLOY_ONLY=true
                        ;;
                    clean)
                        CLEAN_ONLY=true
                        ;;
                    *)
                        usage
                        ;;
                esac
                ;;
            r) AWS_REGION="$OPTARG" ;;
            p) AWS_DEFAULT_PROFILE="$OPTARG" ;;
            e) EMAIL="$OPTARG" ;;
            n) SOLUTION_NAME="$OPTARG" ;;
            v) VERSION="$OPTARG" ;;
            --platform) DEFAULT_BUILD_PLATFORM="$OPTARG" ;;
            b) SOLUTION_BUCKET="$OPTARG" ;;
            h) usage ;;
            ?) usage ;;
        esac
    done
}

parse_args "$@"
# Verify required parameters
if [ -z "$AWS_REGION" ] || [ -z "$AWS_DEFAULT_PROFILE" ] || [ -z "$EMAIL" ]; then
    echo "Error: Required parameters missing"
    usage
fi

# Set default values if no specific flags provided
if [ "$BUILD_ONLY" != true ] && \
[ "$DEPLOY_ASSET_ONLY" != true ] && \
[ "$TEMPLATE_DEPLOY_ONLY" != true ] && \
[ "$DOCKER_BUILD_ONLY" != true ]; then
    echo "No specific deployment flag provided, running all steps"
    BUILD_ONLY=true
    DEPLOY_ASSET_ONLY=true 
    TEMPLATE_DEPLOY_ONLY=true
    DOCKER_BUILD_ONLY=true
else
    echo "Specific deployment flag provided, running only selected steps"
    if [ "$BUILD_ONLY" = true ]; then
        echo "Building solution artifacts"
    fi
    if [ "$DEPLOY_ASSET_ONLY" = true ]; then
        echo "Deploying solution artifacts"
    fi
    if [ "$TEMPLATE_DEPLOY_ONLY" = true ]; then
        echo "Deploying CloudFormation templates"
    fi
    if [ "$DOCKER_BUILD_ONLY" = true ]; then
        echo "Building Docker images"
    fi
fi

# Set dependent variables
DIST_OUTPUT_BUCKET=${SOLUTION_BUCKET}-$AWS_REGION
TEMPLATE_OUTPUT_BUCKET=$SOLUTION_BUCKET
# Container settings
SOLUTION_ECR_REPO_NAME="clickstream-analytics-on-aws"

# ===== S3 BUCKET SETUP =====
# Create required S3 buckets if they don't exist

# Create/verify solution bucket
aws s3 ls s3://$SOLUTION_BUCKET --profile $AWS_DEFAULT_PROFILE --region $AWS_REGION 2>&1 > /dev/null || \
    aws s3 mb s3://$SOLUTION_BUCKET --profile $AWS_DEFAULT_PROFILE --region $AWS_REGION

# Create/verify distribution bucket
aws s3 ls s3://$DIST_OUTPUT_BUCKET --profile $AWS_DEFAULT_PROFILE --region $AWS_REGION 2>&1 > /dev/null || \
    aws s3 mb s3://$DIST_OUTPUT_BUCKET --profile $AWS_DEFAULT_PROFILE --region $AWS_REGION

# ===== ECR REPOSITORY SETUP =====
# Create ECR repository for container images

echo "Creating ECR repository if it doesn't exist..."
# Attempt to describe repository, create if it doesn't exist
aws ecr describe-repositories --repository-names ${SOLUTION_ECR_REPO_NAME} --region ${AWS_REGION} --profile ${AWS_DEFAULT_PROFILE} 2>/dev/null || \
aws ecr create-repository \
    --repository-name ${SOLUTION_ECR_REPO_NAME} \
    --image-scanning-configuration scanOnPush=true \
    --region ${AWS_REGION} \
    --profile ${AWS_DEFAULT_PROFILE}

# Verify ECR repository creation
if [ $? -eq 0 ]; then
    echo "ECR repository created successfully!"
else
    echo "Failed to create ECR repository!"
    exit 1
fi
echo "ECR repository created successfully!"

# ===== CONFIGURATION UPDATES =====
# Update configuration files with deployment-specific values

# Get AWS account ID for configuration
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region $AWS_REGION --profile $AWS_DEFAULT_PROFILE)
echo "AWS Account ID: $ACCOUNT_ID"

# Update solution configuration with account ID and ECR repository
sed -i.bak \
  -e "s/__ACCOUNT_ID__/$ACCOUNT_ID/g" \
  -e "s/__SOLUTION_ECR_REPO_NAME__/$SOLUTION_ECR_REPO_NAME/g" \
  -e "s/__SOLUTION_BUCKET__/$SOLUTION_BUCKET/g" \
  -e "s/__SOLUTION_ECR_BUILD_VERSION__/$VERSION/g" \
  ./solution_config

# ===== BUILD AND PACKAGE =====
# Build solution artifacts and prepare for deployment

# Install dependencies
echo "Installing dependencies..."
pnpm install

if [ "$BUILD_ONLY" = true ]; then
    export SOLUTION_VERSION=$VERSION
    echo "Building solution artifacts with version: $SOLUTION_VERSION"

    # Build solution artifacts
    chmod +x ./build-s3-dist.sh && ./build-s3-dist.sh $SOLUTION_BUCKET $SOLUTION_NAME $VERSION
    if [ $? -eq 0 ]; then
        echo "Solution artifacts built successfully!"
    else
        echo "Failed to build solution artifacts!"
        restore_files
        exit 1
    fi
else
    echo "Skipping build step as --build flag is not set."
fi

# ===== CONTAINER DEPLOYMENT =====
# Build and push Docker images to ECR

if [ "$DOCKER_BUILD_ONLY" = true ]; then
    echo "Deploying Docker image to ECR..."

    # Set container-related environment variables
    export BUILD_VERSION=$VERSION
    export SOLUTION_ECR_ACCOUNT=$ACCOUNT_ID
    export SOLUTION_ECR_REPO_NAME=$SOLUTION_ECR_REPO_NAME
    export BUILD_PLATFORM=$DEFAULT_BUILD_PLATFORM
    export AWS_DEFAULT_PROFILE=$AWS_DEFAULT_PROFILE
    export AWS_REGION=$AWS_REGION

    # Logout from public ECR to ensure clean authentication
    docker logout public.ecr.aws
    # Run container build and push script
    node ./post-build-1/index.js

    if [ $? -eq 0 ]; then
        echo "Docker images built and pushed successfully!"
    else
        echo "Failed to build and push Docker images!"
        restore_files
        exit 1
    fi

    # Check and run tag-images.sh if it exists
    if [ -f "./tag-images.sh" ]; then
        chmod +x ./tag-images.sh && ./tag-images.sh $AWS_REGION
        if [ $? -ne 0 ]; then
            echo "Failed to tag images!"
            restore_files
            exit 1
        fi
        echo "Images tagged successfully!"
    else 
        echo "tag-images.sh not found, skipping image tagging"
    fi
else
    echo "Skipping Docker build step as --docker-build flag is not set."
fi


# ===== ASSET DEPLOYMENT =====
if [ "$DEPLOY_ASSET_ONLY" = true ]; then
    # Deploy artifacts to S3
    chmod +x ./deploy-assets.sh && \
        ./deploy-assets.sh $SOLUTION_BUCKET $DIST_OUTPUT_BUCKET \
            $SOLUTION_NAME $VERSION $AWS_DEFAULT_PROFILE $AWS_REGION
    if [ $? -eq 0 ]; then
         echo "Artifacts copied successfully!"
    else
        echo "Failed to copy artifacts!"
        restore_files
        exit 1
    fi
else
    echo "Skipping deploy step as --deploy flag is not set."
fi


if [ "$TEMPLATE_DEPLOY_ONLY" = true ]; then
    # Deploy template from s3 bucket
    echo "Deploying CloudFormation template from S3 bucket..."

    DOMAIN_NAME="amazonaws.com"
    TEMPLATE_NAME="cloudfront-s3-control-plane-stack-global.template.json"
    PARAMETERS="ParameterKey=Email,ParameterValue=${EMAIL} \
           $(cat ./global_region_template_parameters)"

    # Check if the region is a CN region
    if [[ "${AWS_REGION}" == "cn-northwest-1" || "${AWS_REGION}" == "cn-north-1" ]]; then
        TEMPLATE_NAME="cloudfront-s3-control-plane-stack-cn.template.json"
        DOMAIN_NAME="amazonaws.com.cn"
        PARAMETERS="ParameterKey=Email,ParameterValue=${EMAIL} \
            $(cat ./cn_region_template_parameters)"
    fi
    
    # Create unique S3 path to avoid CloudFormation caching
    TIMESTAMP=$(date +"%Y%m%d%H%M%S")
    UNIQUE_S3_PATH="${SOLUTION_NAME}/${VERSION}/${TIMESTAMP}/${TEMPLATE_NAME}"
    
    # Copy template to unique S3 location
    echo "Copying template to unique S3 path to avoid caching..."
    aws s3 cp s3://${SOLUTION_BUCKET}/${SOLUTION_NAME}/${VERSION}/${TEMPLATE_NAME} \
        s3://${SOLUTION_BUCKET}/${UNIQUE_S3_PATH} \
        --region ${AWS_REGION} \
        --profile ${AWS_DEFAULT_PROFILE}
    
    TEMPLATE_URL="https://${SOLUTION_BUCKET}.s3.${AWS_REGION}.${DOMAIN_NAME}/${UNIQUE_S3_PATH}"
    echo "Using template URL: ${TEMPLATE_URL}"
    echo "Using parameters: ${PARAMETERS}"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name ${SOLUTION_NAME} --region ${AWS_REGION} --profile ${AWS_DEFAULT_PROFILE} >/dev/null 2>&1; then
        echo "Stack exists, updating..."
        
        aws cloudformation update-stack \
            --template-url ${TEMPLATE_URL} \
            --stack-name ${SOLUTION_NAME} \
            --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
            --parameters ${PARAMETERS} \
            --region ${AWS_REGION} \
            --profile ${AWS_DEFAULT_PROFILE}
            
        echo "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete \
            --stack-name ${SOLUTION_NAME} \
            --region ${AWS_REGION} \
            --profile ${AWS_DEFAULT_PROFILE}
    else
        echo "Stack does not exist, creating..."
        aws cloudformation create-stack \
            --template-url ${TEMPLATE_URL} \
            --stack-name ${SOLUTION_NAME} \
            --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
            --parameters ${PARAMETERS} \
            --region ${AWS_REGION} \
            --profile ${AWS_DEFAULT_PROFILE}
            
        echo "Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete \
            --stack-name ${SOLUTION_NAME} \
            --region ${AWS_REGION} \
            --profile ${AWS_DEFAULT_PROFILE}
    fi

    # ===== DEPLOYMENT VERIFICATION =====
    # Check final deployment status and cleanup

    if [ $? -eq 0 ]; then
        echo "Deployment successful!"

        # Print stack outputs
        echo "Stack Outputs:"
        aws cloudformation describe-stacks \
            --stack-name ${SOLUTION_NAME} \
            --query 'Stacks[0].Outputs[]' \
            --output table \
            --region ${AWS_REGION} \
            --profile ${AWS_DEFAULT_PROFILE}
        if [ $? -ne 0 ]; then
            echo "Failed to retrieve stack outputs!"
            restore_files
        fi     
        # Remove temporary build artifacts
        if [ "$CLEAN_ONLY" = true ]; then
            echo "Cleaning up build artifacts..."
            rm -rf ./global-s3-assets/ 2>/dev/null || true
            rm -rf ./regional-s3-assets/ 2>/dev/null || true
        else
            echo "Skipping cleanup step as --clean flag is not set."
            echo "To clean up build artifacts, run the script with --clean flag."
        fi
    else
        echo "Failed to deploy CloudFormation template!"
        restore_files
        exit 1
    fi

    echo "CloudFormation stack deployed successfully!"

    # Clean up unique S3 path after deployment
    echo "Cleaning up unique S3 path..."
    aws s3 ls s3://${SOLUTION_BUCKET}/${UNIQUE_S3_PATH} --region ${AWS_REGION} --profile ${AWS_DEFAULT_PROFILE} 2>/dev/null && \
    aws s3 rm s3://${SOLUTION_BUCKET}/${UNIQUE_S3_PATH} \
        --region ${AWS_REGION} \
        --profile ${AWS_DEFAULT_PROFILE}

    if [ $? -ne 0 ]; then
        echo "Failed to clean up unique S3 path!"
        restore_files
        exit 1
    fi
    echo "Unique S3 path cleaned up successfully!" 

fi

# Restore configuration files to original state
restore_files


# ===== OUTPUT DEPLOYMENT DETAILS =====

# Print solution version
echo "Solution Version: $VERSION"
echo "Exported Solution Version with build id: $SOLUTION_VERSION"
# Print solution name
echo "Solution Name: $SOLUTION_NAME"
# Print email
echo "Email: $EMAIL"
# Print AWS region
echo "AWS Region: $AWS_REGION"
# Print AWS profile
echo "AWS Profile: $AWS_DEFAULT_PROFILE"
# Print AWS account ID
echo "AWS Account ID: $ACCOUNT_ID"
# Print solution bucket URLs
aws s3 ls s3://$SOLUTION_BUCKET --profile $AWS_DEFAULT_PROFILE --region $AWS_REGION 2>&1 > /dev/null || \
    aws s3 mb s3://$SOLUTION_BUCKET --profile $AWS_DEFAULT_PROFILE --region $AWS_REGION
echo "Solution bucket URL: https://$SOLUTION_BUCKET.s3.$AWS_REGION.amazonaws.com"

aws s3 ls s3://$DIST_OUTPUT_BUCKET --profile $AWS_DEFAULT_PROFILE --region $AWS_REGION 2>&1 > /dev/null || \
    aws s3 mb s3://$DIST_OUTPUT_BUCKET --profile $AWS_DEFAULT_PROFILE --region $AWS_REGION
echo "Distribution bucket URL: https://$DIST_OUTPUT_BUCKET.s3.$AWS_REGION.amazonaws.com"

# Print ECR repository URL
echo "DEFAULT_BUILD_PLATFORM: ${DEFAULT_BUILD_PLATFORM}"
ECR_REPO_URL="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${SOLUTION_ECR_REPO_NAME}"
echo "ECR Repository URL: https://$ECR_REPO_URL"


# ===== ERROR HANDLING AND TRAPS =====
# Add error trap to catch any uncaught errors and call restore_files
trap 'echo "Error occurred. Cleaning up..."; restore_files; exit 1' ERR

# Add trap for script interruption
trap 'echo "Script interrupted. Cleaning up..."; restore_files; exit 1' SIGINT SIGTERM
