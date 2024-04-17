#!/bin/bash
#
# This script is used to create or update the clickstream stack to the AWS account 
# with local code from deleted or existing stack.
# It requires the AWS CLI to be installed and configured.

set -eo pipefail

helpFunction()
{
   echo ""
   echo "SYNOPSIS"
   echo "      $0 [<Options> ...]"
   echo ""
   echo "Usage: $0 -n <stack name key> -s <stack name or stack arn> -c -profile <AWS profile> -region <AWS region>"
   echo -e "\t-n: The key of stack name. Check main.ts for the detailed keys for different stacks."
   echo -e "\t-s: Stack Name or stack arn. Must specify stack arn when retrieving parameters from deleted stack"
   echo -e "\t-c: Indicate if deploying web console stack. Will deploy data pipeline stack without this option."
   echo -e "\t-p: explicitly specify the AWS Profile. Use the default behavior without specifying it."
   echo -e "\t-r: explicitly specify AWS Region. Use the default behavior without specifying it."
   exit 1;
}

# Set the options of this bash script, get the 
while getopts ":c:n:s:p:r:" opt
do
   case "$opt" in
      n ) stackNameKey="$OPTARG" ;;
      s ) stackName="$OPTARG" ;;
      r ) region="$OPTARG" ;;
      p ) profile="$OPTARG" ;;
      c ) deployWebConsole="$OPTARG" ;;
      ? ) helpFunction ;;
   esac
done

# print the error and exit if the stackName or name key is not provided
if [ -z "$stackNameKey" ]; then
  echo "Stack name key must be specified."
  helpFunction
fi
if [ -z "$stackName" ]; then
  echo "Stack name must be specified."
  helpFunction
fi

cdk_options_string=""
if [ -n "$profile" ]; then
  cdk_options_string="${cdk_options_string} --profile $profile"
fi

envs_string=""
if [ -n "$region" ]; then
  envs_string="${envs_string}export AWS_REGION=$region;"
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
  # Check if parameter value is a valid JSON
  if echo "$param_value" | jq . > /dev/null 2>&1; then
    # Escaping JSON string for command line
    param_value=$(echo "$param_value" | jq -c . | sed 's/"/\\"/g')
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

context_string=""
if [ "$deployWebConsole" != "true" ]; then
  context_string="${context_string} -c ignoreWebConsoleSynth=true"
fi

# Print the concatenated parameter string
echo "Concatenated parameters: $param_string"

echo "Concatenated tags: $tag_string"

echo "Final command: $envs_string npx cdk deploy $cdk_options_string $stackName $context_string -c $stackNameKey=$stackName $param_string  $tag_string --require-approval never"

bash -c "$envs_string npx cdk deploy $cdk_options_string $stackName $context_string -c $stackNameKey=$stackName $param_string  $tag_string --require-approval never"
