# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/bin/bash

set -x

# Configure logging
log_info() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - INFO - $1"
}

log_error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR - $1" >&2
}

# Function to parse parameters from Key=Value format
parse_parameters() {
    local params=("$@")
    local parsed_params="["
    local first=true
    
    for param in "${params[@]}"; do
        IFS='=' read -r key value <<< "$param"
        if [ "$first" = true ]; then
            first=false
        else
            parsed_params+=","
        fi
        parsed_params+="{\"ParameterKey\":\"${key}\",\"ParameterValue\":\"${value}\"}"
    done
    
    parsed_params+="]"
    echo "$parsed_params"
}

# Function to check if stack is in DELETE_FAILED state
check_delete_failed() {
    local stack_name="$1"
    local profile_arg="$2" 
    local region="$3"

    local stack_status=$(aws $profile_arg cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$region" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null)

    if [ "$stack_status" == "DELETE_FAILED" ]; then
        return 0
    else
        return 1
    fi
}

create_stack() {
    # Create new stack
    if aws $profile_arg cloudformation create-stack \
        --stack-name "$stack_name" \
        --template-body "file://$template_file" \
        $([ ${#parameters[@]} -gt 0 ] && echo "--parameters $parsed_params" || echo "") \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region "$region" \
        --on-failure ROLLBACK; then
        
        log_info "Stack creation initiated"
        if [ "$wait" = true ]; then
            log_info "Waiting for stack creation to complete..."
            aws $profile_arg cloudformation wait stack-create-complete \
                --stack-name "$stack_name" \
                --region "$region"
            
            if [ $? -eq 0 ]; then
                log_info "Stack creation completed successfully"
                return 0
            else
                log_error "Stack creation failed"
                return 1
            fi
        fi
        return 0
    else
        log_error "Failed to create stack"
        return 1
    fi
}

# Function to deploy CloudFormation stack
deploy_cloudformation_stack() {
    local stack_name="$1"
    local template_file="$2"
    local region="${3:-us-east-1}"
    local profile="$4"
    local wait="$5"
    local update_stack="$6"
    local force_update_stack="$7"
    shift 7
    local parameters=("$@")

    # Use profile if provided
    local profile_arg=""
    if [ -n "$profile" ]; then
        profile_arg="--profile $profile"
    fi

    # Read template file
    if [ ! -f "$template_file" ]; then
        log_error "Template file not found: $template_file"
        return 1
    fi

    # Parse parameters
    local parsed_params
    if [ ${#parameters[@]} -gt 0 ]; then
        parsed_params=$(parse_parameters "${parameters[@]}")
    else
        parsed_params="[]"
    fi

    # Check if stack exists
    if aws $profile_arg cloudformation describe-stacks --stack-name "$stack_name" --region "$region" &>/dev/null; then
        log_info "Stack $stack_name $region exists."
        
        if [ "$update_stack" = true ]; then
            log_info "WARNING: Attempting update."
            # Try to update stack
            if aws $profile_arg cloudformation update-stack \
                --stack-name "$stack_name" \
                --template-body "file://$template_file" \
                $([ ${#parameters[@]} -gt 0 ] && echo "--parameters $parsed_params" || echo "") \
                --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
                --use-previous-template \
                --disable-rollback \
                --region "$region" 2>/dev/null; then
                
                log_info "Stack update initiated"
                if [ "$wait" = true ]; then
                    log_info "Waiting for stack update to complete..."
                    aws $profile_arg cloudformation wait stack-update-complete \
                        --stack-name "$stack_name" \
                        --region "$region"
                    
                    if [ $? -eq 0 ]; then
                        log_info "Stack update completed successfully"
                        return 0
                    else
                        log_error "Stack update failed"
                        return 1
                    fi
                fi
                return 0
            else
                if [[ $? -eq 255 ]] && [[ $(aws $profile_arg cloudformation describe-stacks --stack-name "$stack_name" --region "$region" 2>&1) == *"No updates are to be performed"* ]]; then
                    log_info "No updates required for stack"
                    return 0
                else
                    log_error "Failed to update stack"
                    return 1
                fi
            fi
        else
            if [ "$force_update_stack" == true ]; then
                log_info "WARNING: Attempting to delete."

                # Modified delete stack section with force delete handling
                if aws $profile_arg cloudformation delete-stack \
                    --stack-name "$stack_name" \
                    $(check_delete_failed "$stack_name" "$profile_arg" "$region" && echo "--deletion-mode FORCE_DELETE_STACK") \
                    --region "$region"; then
                    
                    log_info "Stack deletion initiated"
                    if [ "$wait" = true ]; then
                        log_info "Waiting for stack deletion to complete..."
                        aws $profile_arg cloudformation wait stack-delete-complete \
                            --stack-name "$stack_name" \
                            --region "$region"
                        
                        if [ $? -eq 0 ]; then
                            log_info "Stack deletion completed successfully"
                            log_info "WARNING: Attempting to re-create."
                            create_stack
                            return 0
                        else
                            log_error "Stack deletion failed"
                            return 1
                        fi
                    fi
                    return 0
                else
                    log_error "Failed to delete stack"
                    return 1
                fi
            fi
        fi
    else
        log_info "Stack $stack_name does not exist. Creating new stack."
        create_stack
        
    fi
}

# Parse command line arguments
usage() {
    echo "Usage: $0 --stack-name STACK_NAME --template-file TEMPLATE_FILE [OPTIONS]"
    echo
    echo "Options:"
    echo "  --stack-name STACK_NAME        Name of the CloudFormation stack"
    echo "  --template-file TEMPLATE_FILE  Path to the CloudFormation template.yml file"
    echo "  --parameters KEY=VALUE         Stack parameters (can be specified multiple times)"
    echo "  --region REGION               AWS region (default: us-east-1)"
    echo "  --profile PROFILE             AWS profile name"
    echo "  --wait                        Wait for stack creation/update to complete"
    echo "  --update-stack                Update stack if it exists"
    echo "  --force-update-stack          Force update stack if it exists (delete )"
    echo "  --help                        Display this help message"
    exit 1
}

# Main script
main() {
    local stack_name=""
    local template_file=""
    local region="us-east-1"
    local profile=""
    local wait=false
    local update_stack=false
    local force_update_stack=false
    local parameters=()

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --stack-name)
                stack_name="$2"
                shift 2
                ;;
            --template-file)
                template_file="$2"
                shift 2
                ;;
            --parameters)
                parameters+=("$2")
                shift 2
                ;;
            --region)
                region="$2"
                shift 2
                ;;
            --profile)
                profile="$2"
                shift 2
                ;;
            --wait)
                wait=true
                shift
                ;;
            --update-stack)
                update_stack=true
                shift
                ;;
            --force-update-stack)
                force_update_stack=true
                shift
                ;;
            --help)
                usage
                ;;
            *)
                log_error "Unknown parameter: $1"
                usage
                ;;
        esac
    done

    # Validate required parameters
    if [ -z "$stack_name" ] || [ -z "$template_file" ]; then
        log_error "Missing required parameters"
        usage
    fi

    # Deploy stack
    if deploy_cloudformation_stack "$stack_name" "$template_file" "$region" "$profile" "$wait" "$update_stack" $force_update_stack "${parameters[@]}"; then
        if [ "$wait" = true ]; then
            log_info "Stack deployment completed successfully"
        else
            log_info "Stack deployment initiated"
        fi
    else
        log_error "Stack deployment failed"
        exit 1
    fi
}

# Run main function
main "$@"
