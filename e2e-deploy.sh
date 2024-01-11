#!/bin/bash
#
# This script is used to create or update the clickstream stack to the AWS account 
# with local code from deleted or existing stack.
# It requires the AWS CLI to be installed and configured.

set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <stack-name-key> <stack-name or stack-id>"
  echo "Example: $0 modelRedshiftStackName Clickstream-DataModelingRedshift-xxx"
  echo "Example for retrieving parameters from deleted stack: $0 modelRedshiftStackName arn:aws:cloudformation:ap-northeast-1:123456789012:stack/Clickstream-DataModelingRedshift-xxx/18df3b90-a943-11ee-86a1-0ef0a7b32a81"
  exit 1
fi

# get the first options of this bash script
stackNameKey=$1
stackName=$2

# print the error and exit if the stackName is not provided
if [ -z "$stackName" ]; then
  printf "Please provide the stack name as the first argument.\n"
  exit 5
fi

# AWS CLI command to describe CloudFormation stack parameters
parameters=$(aws cloudformation describe-stacks --stack-name "$stackName" --query "Stacks[0].Parameters" --output json)

tags=$(aws cloudformation describe-stacks --stack-name "$stackName" --query "Stacks[0].Tags" --output json)

# extract the stack name 'Clickstream-DataModelingRedshift-xxx' from aws ARN like arn:aws:cloudformation:ap-northeast-1:123456789012:stack/Clickstream-DataModelingRedshift-xxx/18df3b90-a943-11ee-86a1-0ef0a7b32a81 or arn:aws-cn:cloudformation:cn-north-1:123456789012:stack/Clickstream-DataModelingRedshift-xxx/18df3b90-a943-11ee-86a1-0ef0a7b32a81
if [[ $stackName == *"arn:aws:cloudformation"* || $stackName == *"arn:aws-cn:cloudformation"* ]]; then
  stackName=$(echo $stackName | cut -d'/' -f2)

  echo "Stack name extracted from ARN: $stackName"
fi

# Check if the stack exists
if [ -z "$parameters" ]; then
  echo "Error: Stack not found or no parameters available."
  exit 1
fi

# Concatenate parameters into a string
param_string=""
IFS=$'\n'
for param in $(echo "$parameters" | jq -c '.[]'); do
  param_name=$(echo "$param" | jq -r '.ParameterKey')
  param_value=$(echo "$param" | jq -r '.ParameterValue')
  # continue iter if the $param_value is empty
  if [ -z "$param_value" ]; then
    continue
  fi
  param_string="${param_string} --parameters ${param_name}=\"${param_value}\""
done

# Concatenate tags into a string
tag_string=""
IFS=$'\n'
for tag in $(echo "$tags" | jq -c '.[]'); do
  tag_key=$(echo "$tag" | jq -r '.Key')
  tag_value=$(echo "$tag" | jq -r '.Value')
  # continue iter if the $tag_value is empty
  if [ -z "$tag_value" ]; then
    continue
  fi
  tag_string="${tag_string} --tags ${tag_key}=\"${tag_value}\""
done

# Print the concatenated parameter string
echo "Concatenated parameters: $param_string"

echo "Concatenated tags: $tag_string"

echo "Final command: npx cdk deploy $stackName -c ignoreWebConsoleSynth=true -c $stackNameKey=$stackName $param_string  $tag_string --require-approval never"

bash -c "npx cdk deploy $stackName -c ignoreWebConsoleSynth=true -c $stackNameKey=$stackName $param_string  $tag_string --require-approval never"
