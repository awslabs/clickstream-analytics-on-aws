#!/bin/bash

# Variables
TEST_NAME=$1
DOCKERFILE_PATH="./Dockerfile"
IMAGE_NAME="clickstream-sample-data"
TAG=$TEST_NAME
AWS_REGION=$3
ECR_REPO_NAME="clickstream-sample-data-repo-${TEST_NAME}"
NUMBER_OF_TASKS=$2
CLUSTER_NAME="clickstream-sample-data-cluster-${TEST_NAME}"
SERVICE_NAME="clickstream-sample-data-service-${TEST_NAME}"
TASK_DEFINITION_NAME="clickstream-sample-data-task-${TEST_NAME}"
SUBNET_IDS=""
SECURITY_GROUP_ID=""
LOG_GROUP_NAME="/ecs/clickstream-sample-data-log-${TEST_NAME}"
ROLE_NAME="clickstream-sample-data-ecs-task-role-${TEST_NAME}-${AWS_REGION}"

# backup amplifyconfiguration.json for later checking
cp -f amplifyconfiguration.json "amplifyconfiguration-${TEST_NAME}.json"

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
ROLE="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"

# Check if the AWS_ACCOUNT_ID variable is set
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "Failed to retrieve AWS account ID."
    exit 1
else
    echo "AWS Account ID: $AWS_ACCOUNT_ID"
fi

# Get the default VPC ID
DEFAULT_VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region ${AWS_REGION}  --query "Vpcs[0].VpcId" --output text)

if [ -z "$DEFAULT_VPC_ID" ]; then
    echo "No default VPC found."
    exit 1
fi

# Fetch Subnet IDs if SUBNET_IDS is empty
if [ -z "$SUBNET_IDS" ]; then
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$DEFAULT_VPC_ID" --region ${AWS_REGION} --query "Subnets[*].SubnetId" --output text)
    SUBNET_IDS=$(echo $SUBNET_IDS | sed 's/ /,/g')  # Convert space-separated list to comma-separated
    if [ -z "$SUBNET_IDS" ]; then
        echo "No subnets found in the default VPC."
        exit 1
    fi
    echo "SUBNET_IDS=\"$SUBNET_IDS\""
fi

# Fetch Security Group ID if SECURITY_GROUP_ID is empty
if [ -z "$SECURITY_GROUP_ID" ]; then
    SECURITY_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$DEFAULT_VPC_ID" --region ${AWS_REGION} --query "SecurityGroups[?GroupName=='default'].GroupId" --output text)
    if [ -z "$SECURITY_GROUP_ID" ]; then
        echo "No default security group found in the default VPC."
        exit 1
    fi
    echo "SECURITY_GROUP_ID=\"$SECURITY_GROUP_ID\""
fi

# Create a CloudWatch log group if it doesn't exist
LOG_GROUP_EXISTS=$(aws logs describe-log-groups --log-group-name-prefix "${LOG_GROUP_NAME}" --query 'logGroups[?logGroupName==`'${LOG_GROUP_NAME}'`]' --output text --region ${AWS_REGION})

if [ -z "$LOG_GROUP_EXISTS" ]; then
  echo "start create log group"
  aws logs create-log-group --log-group-name "${LOG_GROUP_NAME}" --region ${AWS_REGION}
fi

# Check if the role exists
ROLE_EXISTS=$(aws iam list-roles --query 'Roles[?RoleName==`'${ROLE_NAME}'`].RoleName' --output text)

if [ -z "$ROLE_EXISTS" ]; then
  echo "start create role"
  # Create a trust policy file
  echo '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' > TrustPolicy.json


  # Create the role with the trust policy
  aws iam create-role --role-name "${ROLE_NAME}" --assume-role-policy-document file://TrustPolicy.json

  # Attach the permission
  aws iam attach-role-policy --role-name "${ROLE_NAME}" --policy-arn "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
  aws iam attach-role-policy --role-name "${ROLE_NAME}" --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
fi

# Clean up the trust policy file
rm -f TrustPolicy.json

# Full image name with AWS account ID and region
FULL_IMAGE_NAME="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${TAG}"

# Get the login command from ECR and execute it directly
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build your Docker image locally
docker build -t $IMAGE_NAME -f $DOCKERFILE_PATH .

# Check if ECR repository exists
REPO_EXISTS=$(aws ecr describe-repositories --repository-names "${ECR_REPO_NAME}" --region ${AWS_REGION} 2>&1)

if [ $? -ne 0 ]; then
  # If the repository does not exist in ECR, create it.
  aws ecr create-repository --repository-name "${ECR_REPO_NAME}" --region ${AWS_REGION}
fi

# Tag the Docker image with the full image name
docker tag $IMAGE_NAME:latest $FULL_IMAGE_NAME

# Push Docker image to ECR
docker push $FULL_IMAGE_NAME

# Create a task definition file
cat > task-definition.json << EOF
{
  "family": "${TASK_DEFINITION_NAME}",
  "executionRoleArn": "${ROLE}",
  "taskRoleArn": "${ROLE}",
  "containerDefinitions": [
    {
      "name": "${IMAGE_NAME}",
      "image": "${FULL_IMAGE_NAME}",
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "${LOG_GROUP_NAME}",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ClickStream-Test"
        }
      }    
    }
  ], 
  "networkMode": "awsvpc",  
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048"
}
EOF


# Register the task definition with ECS
aws ecs register-task-definition --region $AWS_REGION  --cli-input-json file://task-definition.json

# Check if the ECS cluster exists
CLUSTER_EXISTS=$(aws ecs describe-clusters --clusters "${CLUSTER_NAME}" --region ${AWS_REGION} | jq -r .clusters[0].status)

if [ "$CLUSTER_EXISTS" != "ACTIVE" ]; then
  # If the cluster does not exist, create it
  aws ecs create-cluster --cluster-name "${CLUSTER_NAME}" --region ${AWS_REGION} --settings name=containerInsights,value=enabled
fi

aws ecs create-service --service-name "${SERVICE_NAME}" --desired-count ${NUMBER_OF_TASKS} --task-definition "${TASK_DEFINITION_NAME}" --cluster "${CLUSTER_NAME}" --region ${AWS_REGION} --launch-type "FARGATE" --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}"

# Clean up
rm -f task-definition.json


