# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3
import time


def get_secret(region, secrete_name):
    #secret_name: /clickstream/reporting/user/project_auto19222
    client = boto3.client('secretsmanager', region_name=region)
    response = client.get_secret_value(SecretId=secrete_name)
    return response['ARN']


def serverless_execute_statement(redshift_data_client, database, workgroupName, sql):
    # redshift_data_client = session.client('redshift-data', region_name=region)
    #Database='project_auto6321',
    #WorkgroupName='clickstream-project-auto6321',
    #Sql='SELECT * FROM "project_auto6321"."test_app_name"."ods_events" limit 1'
    response = redshift_data_client.execute_statement(
        Database=database,
        WorkgroupName=workgroupName,
        Sql=sql
    )
    query_id = response['Id']
    describe_response = redshift_data_client.describe_statement(Id=query_id)
    status = describe_response['Status']

    while status == 'RUNNING' or status == 'PICKED' or status == 'STARTED':
        describe_response = redshift_data_client.describe_statement(Id=query_id)
        print(f'---redshift response is {describe_response}---')
        status = describe_response['Status']
        assert status != 'FAILED', f'{status}! {describe_response}'
        if status == 'FINISHED':
            get_result_response = redshift_data_client.get_statement_result(Id=query_id)
            result_set = get_result_response['Records']
            return result_set

def provision_execute_query(region, secret_name, ClusterIdentifier, Database, sql):
    redshift_client = boto3.client('redshift-data', region_name=region)
    secret_arn = get_secret(region, secret_name)
    execute_response = redshift_client.execute_statement(
        ClusterIdentifier=ClusterIdentifier,
        Database=Database,
        SecretArn=secret_arn,
        Sql=sql,
        StatementName='test',
        WithEvent=True
    )
    query_id = execute_response['Id']
    response = redshift_client.describe_statement(
        Id=query_id
    )
    status = response['Status']
    while status == 'RUNNING' or status == 'QUEUED' or status == 'PICKED' or status == 'STARTED':
        response = redshift_client.describe_statement(
            Id=query_id
        )
        status = response['Status']
        assert status != 'FAILED', f'{status}! {response}'
        if status == 'FINISHED':
            get_result_response = redshift_client.get_statement_result(Id=query_id)
            result_set = get_result_response['Records']
            return result_set
 

def delete_serverless_namespace(region, name):
    redshift_client = boto3.client('redshift-serverless', region_name=region)
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

