# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3


def get_stack_info(region, stack_name):
    cf_client = boto3.client('cloudformation', region_name=region)
    response = cf_client.describe_stacks(StackName=stack_name)
    return response

def list_all_stacks(region):
    cf_client = boto3.client('cloudformation', region_name=region)
    paginator = cf_client.get_paginator('list_stacks')
    operation_parameters = {
        'StackStatusFilter': ['CREATE_COMPLETE', 'UPDATE_COMPLETE']
    }
    page_iterator = paginator.paginate(**operation_parameters)
    stacks = []
    for page in page_iterator:
        stacks = stacks + page['StackSummaries']
    return stacks

def list_all_stack_resources(region, stackName):
    cf_client = boto3.client('cloudformation', region_name=region)
    paginator = cf_client.get_paginator('list_stack_resources')
    operation_parameters = {
        'StackName': stackName
    }
    page_iterator = paginator.paginate(**operation_parameters)
    resources = []
    for page in page_iterator:
        resources = resources + page['StackResourceSummaries']
    return resources


