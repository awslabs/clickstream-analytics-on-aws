#!/bin/bash

# Variables
TEST_NAME=$1
AWS_REGION=$2
CLUSTER_NAME="clickstream-sample-data-cluster-${TEST_NAME}"
SERVICE_NAME="clickstream-sample-data-service-${TEST_NAME}"
TASK_DEFINITION_NAME="clickstream-sample-data-task-${TEST_NAME}"
ECR_REPO_NAME="clickstream-sample-data-repo-${TEST_NAME}"
LOG_GROUP_NAME="/ecs/clickstream-sample-data-log-${TEST_NAME}"
ROLE_NAME="clickstream-sample-data-ecs-task-role-${TEST_NAME}-${AWS_REGION}"

# De-register ECS Service
echo "Deleting ECS Service..."
aws ecs update-service --cluster "${CLUSTER_NAME}" --service "${SERVICE_NAME}" --desired-count 0 --region ${AWS_REGION}
aws ecs delete-service --cluster "${CLUSTER_NAME}" --service "${SERVICE_NAME}" --force --region ${AWS_REGION}

sleep 30

# Deregister ECS Task Definition
echo "Deregistering Task Definitions..."
TASK_DEFS=$(aws ecs list-task-definitions --family-prefix "${TASK_DEFINITION_NAME}" --region ${AWS_REGION} --query "taskDefinitionArns[]" --output text)
for task_def in $TASK_DEFS; do
  aws ecs deregister-task-definition --task-definition "${task_def}" --region ${AWS_REGION}
done

# Delete ECS Cluster
echo "Deleting ECS Cluster..."
aws ecs delete-cluster --cluster "${CLUSTER_NAME}" --region ${AWS_REGION}

# Delete ECR repository
echo "Deleting ECR Repository..."
aws ecr delete-repository --repository-name "${ECR_REPO_NAME}" --region ${AWS_REGION} --force

# Detach IAM policies and delete role
echo "Detaching IAM Policies and Deleting Role..."
aws iam detach-role-policy --role-name "${ROLE_NAME}" --policy-arn "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
aws iam detach-role-policy --role-name "${ROLE_NAME}" --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
aws iam delete-role --role-name "${ROLE_NAME}"

# Delete CloudWatch Log Group
echo "Deleting CloudWatch Log Group..."
aws logs delete-log-group --log-group-name "${LOG_GROUP_NAME}" --region ${AWS_REGION}

rm -f amplifyconfiguration-${TEST_NAME}.json

echo "Cleanup completed."
