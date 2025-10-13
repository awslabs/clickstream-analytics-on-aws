# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

#!/usr/bin/env python3
# Clean up scripts

import time
import os
import boto3
import concurrent.futures

aws_profile_name = os.getenv("AWS_PROFILE")
print("aws_profile_name is ------ " + aws_profile_name)

# Global regions
regions = [
    # 'us-east-1',
    # 'us-east-2',
    # 'us-west-1',
    # 'us-west-2',
    # 'ap-south-1',
    'ap-northeast-2',
    # 'ap-southeast-1',
    # 'ap-southeast-2',
    # 'ap-northeast-1',
    # 'ca-central-1',
    # 'eu-central-1',
    # 'eu-west-1',
    # 'eu-west-2',
    # 'eu-west-3',
    # 'eu-north-1',
    # 'sa-east-1',
]

def get_non_deletable_resources(stack_name, client, direct=False): 
    if direct:
        return []  
    try:
        response = client.describe_stack_events(StackName=stack_name)
        failed_resources = list(set([event['LogicalResourceId']
            for event in response['StackEvents']
            if event['ResourceStatus'] == 'DELETE_FAILED'
        ]))
        for resource in failed_resources:
           if 'Clickstream-Reporting' in resource or 'Clickstream-DataModeling' in resource or 'Clickstream-Ingestion' in resource or 'Clickstream-DataProcessing' in resource or 'Clickstream-Metrics' in resource:
               failed_resources.remove(resource)
        return failed_resources

    except client.exceptions.ClientError as e:
        print(f"Error describing stack resources: {e}")
        return []

def delete_stack(stack_name, client, retained_resources=[]):
    try:
        response = client.delete_stack(
            StackName=stack_name,
            RetainResources=retained_resources
        )
        client.get_waiter('stack_delete_complete').wait(
        StackName=stack_name,
        WaiterConfig={
            'Delay': 30,
            'MaxAttempts': 300
        }
    )
    except client.exceptions.ClientError as e:
        if "ResourceNotReady" in str(e):
            print("Unable to delete the stack due to some resources not being ready.")
            non_deletable_resources = get_non_deletable_resources(stack_name, region, False)
            print(f"Non-deletable resources: {non_deletable_resources}")
        else:
            print(f"Error deleting stack: {e}")

def delete_stack_retain(stack_name_to_delete, region):
    cf_client = boto3.client('cloudformation', region_name=region)
    resources_to_retain = get_non_deletable_resources(stack_name_to_delete, cf_client, True)
    delete_stack(stack_name_to_delete, cf_client, retained_resources=resources_to_retain)

def delete_namespace(region):
    redshift_client = boto3.client('redshift-serverless', region_name=region)
    response = redshift_client.list_namespaces(maxResults=100)
    namespaces = [each['namespaceName'] for each in response['namespaces']]
    print(namespaces)
    for name in namespaces:
        try:
            response = redshift_client.get_workgroup(
            workgroupName=name)
            workgroup_status = response['workgroup']['status']
            time_count = 0
            while workgroup_status in ['CREATING', 'MODIFYING', 'DELETING'] and time_count <= 60:
                response = redshift_client.get_workgroup(workgroupName=name)
                workgroup_status = response['workgroup']['status']
                time.sleep(5)
                time_count += 1
            if workgroup_status == 'AVAILABLE':
                try: 
                    workgroup_response = redshift_client.delete_workgroup(
                    workgroupName=name)
                    print(workgroup_response)
                except Exception as e:
                    print(e)
        except Exception as e:
            print(e)
        response1 = redshift_client.get_namespace(
        namespaceName=name)
        namespace_status = response1['namespace']['status']
        time_count = 0
        while namespace_status in ['MODIFYING', 'DELETING'] and time_count <= 60:
            response1 = redshift_client.get_namespace(namespaceName=name)
            namespace_status = response1['namespace']['status']
            time.sleep(5)
            time_count += 1
        if namespace_status == 'AVAILABLE':
            try: 
                namespace_response = redshift_client.delete_namespace(
                namespaceName=name)
                print(namespace_response)
            except Exception as e:
                print(e)

def delete_roles_starting_with(prefix):
    iam_client = boto3.client('iam')

    try:
        # List roles matching the given prefix
        response = iam_client.list_roles(MaxItems=1000)
        roles = []
        for role in response['Roles']:
            if prefix in role['RoleName']:
                roles.append(role['RoleName'])
        print(roles)

        # Delete each matching role
        for role in roles:
            try:
                response = iam_client.list_attached_role_policies(RoleName=role)
                attached_policies = response['AttachedPolicies']
                for policy in attached_policies:
                    policy_arn = policy['PolicyArn']
                    iam_client.detach_role_policy(RoleName=role, PolicyArn=policy_arn)
                    print(f"Detached policy {policy_arn} from role {role}")
                print(f"Deleting IAM role: {role}")
                iam_client.delete_role(RoleName=role)
            except Exception as e:
                print(e)

        print(f"IAM roles starting with '{prefix}' deleted successfully.")
    except iam_client.exceptions.ClientError as e:
        print(f"Error deleting IAM roles: {e}")

def list_all_stacks(region):
    cf_client = boto3.client('cloudformation', region_name=region)
    paginator = cf_client.get_paginator('list_stacks')
    operation_parameters = {
        'StackStatusFilter': ['DELETE_FAILED', 'UPDATE_COMPLETE', 'CREATE_COMPLETE', 'UPDATE_ROLLBACK_FAILED']
    }
    page_iterator = paginator.paginate(**operation_parameters)
    stacks = []
    for page in page_iterator:
        stacks = stacks + page['StackSummaries']
    return stacks

# delete stacks that fail to delete
max_workers = 20
delete_fail_stacks = []
for region in regions:
    try:
        stacks = list_all_stacks(region)
        # top_level_stacks = [stack for stack in stacks if not stack.get('ParentId')]
    except Exception as e:
        print(e)
        continue

    cf_client = boto3.client('cloudformation', region_name=region)
    for stack in stacks:
        if 'Clickstream-Reporting' in stack['StackName'] or 'Clickstream-DataModeling' in stack['StackName'] or 'Clickstream-Ingestion' in stack['StackName'] or 'Clickstream-DataProcessing' in stack['StackName'] or 'Clickstream-Metrics' in stack['StackName']:
            stack_name_to_delete = stack['StackName']
            delete_fail_stacks.append((stack_name_to_delete, region))
            try:
                response = cf_client.update_termination_protection(
                    StackName=stack['StackName'],
                    EnableTerminationProtection=False)
            except Exception as e:
                print(f"Skip disabling termination protection for stack: {stack['StackName']}")
        else:
            continue
with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
    futures = [executor.submit(delete_stack_retain, *item) for item in delete_fail_stacks]
    concurrent.futures.wait(futures)
print("All delete failed stack clean completed.")

# Deleting s3 bucket for this solution
# bucket = project_name
# bucket_names = [bucket, "tcat-" + bucket, 'tcat-cs-cloudfront', 'tcat-cs-private-exist-vpc']
# print(f"buckets to be deleted should starts with {bucket_names}")
# for bucket_name in bucket_names:
#     s3.delete_bucket_starts_with(bucket_name, profile_name=aws_profile_name, region_name=aws_region_name)

# time.sleep(10)

# delete redshift name space
# for region in regions:
#     try:
#         delete_namespace(region)
#     except Exception as e:
#         print(e)

# Delete IAM roles 
# role_prefix_to_delete = 'tCaT-cs-cloudfront-s3'
# data_modeling_role = 'Clickstream-DataModelingR'
# delete_roles_starting_with(role_prefix_to_delete)
# delete_roles_starting_with(data_modeling_role)