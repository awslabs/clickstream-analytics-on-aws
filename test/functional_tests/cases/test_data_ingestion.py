# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import pytest
import time
import boto3
from API import apis
from clickstream_sample_data_tool import create_event
from utils import sts
from utils import iam
from utils import redshift
from utils import cloudformation
from utils import pipeline
RESOURCE_DELETE=True
WAIT_DELETE=True


@pytest.fixture
def create_project(api_client):
    pipeline_ids = []

    def _create_project():
        try:
            res = api_client.create_project()
            project_id = res['data']['id']
            pipeline_ids.append(project_id)
            return project_id
        except AssertionError as e:
            print(f"Assertion error in _create_project: {e}")
            raise  
        finally:
            print("Finalizing _create_project")
    return _create_project
   
         
def get_sub_stacks_status(region, stacks):
    stack_status = []
    for stack in stacks:
        try:
            status = cloudformation.get_stack_info(region, stack)['Stacks'][0]['StackStatus']
        except Exception as e:
            status = 'DELETE_COMPLETE'
        stack_status.append(status)   
    return  stack_status


def get_sub_stacks(api_client, project_id):
    pipeline_info = api_client.get_pipeline_by_project(project_id)
    stack_details = pipeline.get_pipeline_stackDetails(pipeline_info['data'])
    stacks = [stack_details[i]['stackName'] for i in range(len(stack_details))]
    return stacks

@pytest.fixture
def create_pipeline(api_client, get_config):
    project_ids = []
    region = get_config['stack']['region']

    def _create_pipeline(project_id, sink_type, redshift_type):
        try:
            project_ids.append(project_id)      
            pipeline_id = api_client.create_pipeline(project_id, sink_type, redshift_type)['data']['id']
            print(f'{sink_type} + { redshift_type}: pipeline is creating. pipeline id: {pipeline_id}')
            time.sleep(5)
            # step3 check pipeline status, wait until to be active
            check_pipeline_status(api_client, project_id)
            print(f'{sink_type} + { redshift_type}: pipeline creating finished. Active now!')
            return pipeline_id
        except AssertionError as e:
            print(f"Assertion error in _create_pipeline: {e}")
            raise  
        finally:
            print("Finalizing _create_pipeline")
    yield _create_pipeline
    if RESOURCE_DELETE:
        print("start deleting project")
        project_id = project_ids[0]
        stacks = get_sub_stacks(api_client, project_id)
        print(stacks)
        try:
            api_client.delete_project(project_id)
            if WAIT_DELETE:
                # check pipeline status(Deleting), wait until to be Deleted
                check_pipeline_status(api_client, project_id, 
                                    waiting_status='Deleting', assert_status='Deleted',
                                    waiting_time=120, time_interval=30)
        except Exception as e:
            print(e)
        

@pytest.fixture
def add_app(api_client):
    app_ids = []
    project_ids = []

    def _add_app(project_id):
        res = api_client.add_app(project_id)
        app_id = res['data']['id']
        app_ids.append(app_id)
        project_ids.append(project_id)
        return app_id

    yield _add_app
    print("start deleting app")
    if app_ids and RESOURCE_DELETE:
        api_client.delete_app(project_ids[0], app_ids[0])


@pytest.fixture(scope="function")
def serverless_redshift_execution(get_config):
    namespaces = []
    region = get_config['stack']['region']

    def _serverless_redshift_execution(redshift_data_client, database, workgroupName, count_sql):
        namespaces.append(workgroupName)
        result_set = redshift.serverless_execute_statement(redshift_data_client, database, workgroupName, count_sql) 
        return result_set
    yield _serverless_redshift_execution
    #print("start deleting namespace")

    #if namespaces and RESOURCE_DELETE:
    #    redshift.delete_serverless_namespace(region, namespaces[0])

def serverless_redshift_execution_one_time(redshift_data_client, database, workgroupName, count_sql):   
    result_set = redshift.serverless_execute_statement(redshift_data_client, database, workgroupName, count_sql) 
    return result_set


@pytest.fixture(scope="function")
def api_client(get_token, get_config):
    get_api_client = apis.ApiFactory(get_token, get_config)
    return get_api_client


def check_pipeline_status(api_client, project_id,
                          waiting_status='Creating', assert_status='Active',
                          waiting_time=30, time_interval=60):
    pipeline_status = api_client.get_pipeline_status(project_id)
    time_count = 0
    while pipeline_status == waiting_status and time_count <= waiting_time:
        pipeline_status = api_client.get_pipeline_status(project_id)
        print(f'pipeline status: {pipeline_status}')
        assert pipeline_status != 'Failed', 'Pipeline status is failed! Please check cloudformation for detail!'
        time.sleep(time_interval)
        time_count += 1
    assert pipeline_status == assert_status, 'pipeline status error, please check!'


def get_redshift_admin_role(stack_name, get_config):
    region = get_config['stack']['region']
    cf_client = boto3.client('cloudformation', region_name=region)
    resources = cf_client.list_stack_resources(StackName=stack_name)['StackResourceSummaries']
    stack_id = ''
    redshift_role = ''
    for resource in resources:
        if 'AWS::CloudFormation::Stack' == resource['ResourceType']:
            stack_id = resource['PhysicalResourceId']
            break
  
    resource_client = boto3.resource('cloudformation', region_name=region)
    stack = resource_client.Stack(stack_id)
    stack_resources = stack.resource_summaries.all()
    for resource in stack_resources:
        if 'AWS::IAM::Role' == resource.resource_type and \
                'Clickstream-DataModelingR-RedshiftServerelssWorkg' \
                in resource.physical_resource_id and 'AdminRole' in resource.logical_resource_id:
            redshift_role = resource.physical_resource_id
            break
    return redshift_role

def send_data_test(serverless_redshift_execution, api_client, project_id, app_id, get_config, sink_type, redshift_type):
    # step6 get ingsetion server endpoint
    endpoint = api_client.get_app(app_id, project_id)['data']['pipeline']['endpoint']
    # step7 send data to api endpoint 
    event_count = create_event.create_event_func(app_id, endpoint)
    # step8 get redshift role
    region = get_config['stack']['region']
    database = project_id
    schema = app_id
    pipeline_info = api_client.get_pipeline_by_project(project_id)
    event_table = pipeline.get_redshift_event_table(pipeline_info['data'])
    count_sql = f'SELECT distinct(project_id) as project_id , count(1) as count FROM "{database}"."{schema}"."{event_table}" group by project_id'
    interval_times = 45
    if redshift_type == 'serverless':
        stack_name = ''
        for stack in pipeline.get_pipeline_stackDetails(pipeline_info['data']):
            if stack['stackType'] == 'DataModelingRedshift':
                stack_name = stack['stackName']
                break   
        redshift_role = get_redshift_admin_role(stack_name, get_config)
        # waiting for data to send to redshift
        time.sleep(900)
        # assue role
        redshift_role_arn = iam.get_role_arn_by_rolename(redshift_role)
        # step9 get and check redshift data
        session = sts.assumed_role_session(redshift_role_arn)
        redshift_data_client = session.client('redshift-data', region_name=region)
        workgroupName = f'clickstream-{project_id}'.replace('_','-')
        result_set = serverless_redshift_execution(redshift_data_client, database, workgroupName, count_sql) 
        print(result_set)
        times = 0
        while not result_set and times < interval_times:
            time.sleep(60)
            times += 1
            result_set = serverless_redshift_execution_one_time(redshift_data_client, database, workgroupName, count_sql)
            print(f'{sink_type} + { redshift_type}: waiting for {15 + times} minutes and Redshift result is: {result_set}')
    if redshift_type == 'provision':
        secret_name = f'/clickstream/reporting/user/{project_id}'
        ClusterIdentifier = get_config['provisionRedshift']['clusterIdentifier']
        time.sleep(900)
        result_set = redshift.provision_execute_query(region, secret_name, ClusterIdentifier, database, count_sql)
        print(result_set)
        times = 0
        while not result_set and times < interval_times:
            time.sleep(60)
            times += 1
            result_set = redshift.provision_execute_query(region, secret_name, ClusterIdentifier, database, count_sql)
            print(f'{sink_type} + { redshift_type}: waiting for {15 + times} minutes and Redshift result is: {result_set}')
    assert result_set is not None, 'After waiting for 30 minutes, there is no data in Redshift, please check!'
    project_redshift = result_set[0][0]['stringValue']
    assert project_id == project_redshift, 'filed project_id is wrong please check!'
    event_count_redshift = result_set[0][1]['longValue']
    print(f'{event_count} events send, {event_count_redshift} events in redshift!')
    # assert event_count == event_count_redshift, f'{event_count} events send, but {event_count_redshift} events in redshift!'
            
def autotest_clickStream(create_project, create_pipeline, api_client, add_app, get_config, sink_type, redshift_type, serverless_redshift_execution):
    # step1 create project, project will be deleted when test finishes
    project_id = create_project()
    print(f'{sink_type} + { redshift_type}: project creating succeeded. project id: {project_id}')
    # step2 create pipline

    # pipeline_id = api_client.create_pipeline(project_id, sink_type, redshift_type)['data']['id']
    # print(f'{sink_type} + { redshift_type}: pipeline is creating. pipeline id: {pipeline_id}')
    # time.sleep(5)
    # # step3 check pipeline status, wait until to be active
    # pipeline_info = check_pipeline_status(api_client, pipeline_id, project_id)
    # print(f'{sink_type} + { redshift_type}: pipeline creating finished. Active now!')

    create_pipeline(project_id, sink_type, redshift_type)

    # step4 add app, app will be deleted when test finishes
    app_id = add_app(project_id)
    time.sleep(8)
    print(f'{sink_type} + { redshift_type}: app add succeeded. app id: {app_id}')
    # step5 check pipeline status(updating), wait until to be active again
    check_pipeline_status(api_client, project_id, 
                          waiting_status='Updating', assert_status='Active',
                          waiting_time=120, time_interval=30)
    print(f'{sink_type} + { redshift_type}: pipeline updating finished. Active again!')
    time.sleep(5)
    if get_config['environment'] == 'autotest':
        send_data_test(serverless_redshift_execution, api_client, project_id, app_id, get_config, sink_type, redshift_type)


@pytest.mark.smoke
# ('kafka', 'serverless'),
# ('s3', 'provision'),
@pytest.mark.parametrize('sink_type, redshift_type', [
        ('kinesis', 'serverless'),
    ])
def test(create_project, create_pipeline, api_client, add_app, get_config, sink_type, redshift_type, serverless_redshift_execution):
    autotest_clickStream(create_project, create_pipeline, api_client, add_app, get_config, sink_type, redshift_type, serverless_redshift_execution)