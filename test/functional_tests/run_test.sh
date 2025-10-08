#!/bin/bash
###############################################################################
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#
# PURPOSE:
#  Run automated functional tests against a deployed solution stack
#  For usage instructions: sh run_test.sh --help
###############################################################################

usage() {
  msg "$msg"
  cat <<EOF
Usage: $(basename "${BASH_SOURCE[0]}") --profile PROFILE --region REGION --environment ENV --stack-name STACK

Required Parameters:
--profile         AWS profile for CLI commands
--region          AWS Region, formatted like us-east-1

Required Parameters if environment is 'local':
--stack-name      CloudFormation stack name

Optional Parameters:
--workshop-vpc-stack-name  if empty create CF stack called `clickstream-workshop-new` https://docs.aws.amazon.com/solutions/latest/clickstream-analytics-on-aws/launch-within-vpc.html
--environment     Environment name, e.g autotest, nightswatch. defaults to 'local'.
--extras          Append more commands to pytest run
-h, --help        Show this message
-v, --verbose     Verbose output
EOF
  exit 1
}

validate_required_parameters() {
  msg "Validating required parameters..."

  # Validate required parameters
  [[ -z "${region}" ]] && usage "Missing required parameter: region"
  [[ -z "${profile}" ]] && usage "Missing required parameter: profile"
  [[ -z "${environment}" ]] && usage "Missing required parameter: environment"

  if [[ "${environment}" = "local" ]]; then
    [[ -z "${stack_name}" ]] && usage "Missing required parameter: stack_name"
  fi
}

get_current_dir() {
  # Get directory path of current script, fallback to PWD if not found
  local current_dir
  current_dir=$(dirname "${BASH_SOURCE[0]}")
  if [[ ! -d "$current_dir" ]]; then
    current_dir="$PWD"
  fi
  echo "$current_dir"
}

_venv() {
  # Create a temporary Python virtualenv if no venv is active.
  source "$(get_current_dir)/helper/create_venv.sh"
  create_venv
}

deploy_clickstream_workshop_new_stack() {
  if [[ -z "${workshop_vpc_stack_name}" ]]; then
    workshop_vpc_stack_name='clickstream-workshop-new'
    msg "Deploying stack...${workshop_vpc_stack_name}"
    chmod +x ./templates/deploy_stack.sh
    ./templates/deploy_stack.sh \
      --stack-name $workshop_vpc_stack_name \
      --template-file "./templates/$workshop_vpc_stack_name.yml" \
      --region $region \
      --profile $profile \
      --wait
    
    if [ $? -ne 0 ]; then
      msg "Failed to deploy stack"
      exit 1
    fi
    msg "${workshop_vpc_stack_name} Stack deployed"
  fi
}

run_func_test() {
  # Run pytest with parameters
  msg "Running functional tests..."
  pytest_cmd="pytest -s -m smoke"
  pytest_cmd+=" -vv"
  pytest_cmd+=" --region $region"
  pytest_cmd+=" --environment $environment"
  pytest_cmd+=" --stack_name $stack_name"
  pytest_cmd+=" --maxfail=999"
  pytest_cmd+=" --continue-on-collection-errors"
  pytest_cmd+=" --log-format=\"%(asctime)s %(levelname)s %(message)s\""
  pytest_cmd+=" --log-date-format=\"%Y-%m-%d %H:%M:%S\""
  pytest_cmd+=" --html=report.html"
  pytest_cmd+=" $extras"
  pytest_cmd+=" cases/"

  eval "$pytest_cmd"
  if [ $? -ne 0 ]; then
    msg "Functional tests failed"
    exit 1
  fi
  msg "Functional tests finished"
}

set_environment_vars() {
  msg "Setting environment variables..."

  # Set environment variables
  export AWS_DEFAULT_REGION=$region
  export AWS_PROFILE=$profile
  export USE_DEFAULT_CONFIG=$use_default_config

  msg "Environment variables set"
}

msg() {
  echo >&2 -e "${1-}"
}

parse_params() {
  # Initialize default parameter values
  stack_name=''
  region='us-east-1'
  profile=''
  environment='local'
  extras=''
  secret_name=''
  secret_name_region=$region
  vpc_id=''
  msk_cluster_name=''
  s3_bucket_name=''
  redshift_cluster_identifier=''
  use_default_config=false
  workshop_vpc_stack_name=''


  # Parse command line arguments
  while :; do
    case "${1-}" in
    -h | --help) 
      usage 
      ;;
    -v | --verbose) 
      set -x 
      ;;
    --stack-name)
      stack_name="${2}"
      shift
      ;;
    --region)
      region="${2}"
      shift
      ;;
    --profile)
      profile="${2}"
      shift
      ;;
    --environment)
      environment="${2}"
      shift
      ;;
    --secret-name)
      secret_name="${2}"
      shift
      ;;
    --secret-name-region)
      secret_name_region="${2}"
      shift
      ;;
    --extras)
      extras="${2}"
      shift
      ;;
    --vpc-id)
      vpc_id="${2}"
      shift
      ;;
    --s3-bucket-name)
      s3_bucket_name="${2}"
      shift
      ;;
    --msk-cluster-name)
      msk_cluster_name="${2}"
      shift
      ;;
    --redshift-cluster-identifier)
      redshift_cluster_identifier="${2}"
      shift
      ;;
    --workshop-vpc-stack-name)
      workshop_vpc_stack_name="${2}"
      shift
      ;;
    *) 
      break 
      ;;
    esac
    shift
  done

  # Store remaining arguments
  args=("$@")

  return 0
}

parse_params "$@"

# Display input parameters
msg "Parameters:"
msg "- Profile: ${profile}"
msg "- Stack-name: ${stack_name}" 
msg "- Region: ${region}"
msg "- Environment: ${environment}"
msg "- workshop-vpc-stack-name: ${workshop_vpc_stack_name}"
msg "- Extras: ${extras}"

set_environment_vars
_venv
validate_required_parameters
deploy_clickstream_workshop_new_stack
run_func_test