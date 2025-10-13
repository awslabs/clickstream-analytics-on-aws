# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import requests
import uuid
import random
import json
import time
from utils import config_parse, ec2
from utils import pipeline


class ApiFactory(object):
    def __init__(self, get_token, get_config):
        self.token = get_token
        self.config = get_config
        self.host = self.config['cloudformationInfo']['ClickStreamApiEndpoint']
        self.api_config = config_parse.json_parser('API/api_config.json')

    def call_api(self, method, path, data=None):
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {self.token}",
                   "x-click-stream-request-id": f"{uuid.uuid1()}"}
        url = f"{self.host}{path}"
        response = ''
        if method == 'POST':
            response = requests.post(url, json=data, headers=headers).text
        if method == 'GET':
            response = requests.get(url, headers=headers).text
        if method == 'DELETE':
            response = requests.delete(url, headers=headers).text
        return json.loads(response) if response else {}

    def get_api_info(self, api):
        api_info = self.api_config[api]
        if 'data' in api_info.keys():
            return {'method': api_info['method'], 'path': api_info['path'], 'data': api_info['data']}
        else:
            return {'method': api_info['method'], 'path': api_info['path']}

    def create_project(self):
        api_info = self.get_api_info('create_project')
        data = api_info['data']
        random_id = random.randint(0, 100000)
        data['id'] = f'project_auto{random_id}'
        data['region'] = self.config['stack']['region']
        response = self.call_api(api_info['method'], api_info['path'], api_info['data'])
        assert response["success"] is True, response
        # response: {"success":true,"message":"Project created.","data":{"id":"test_ojru"}}
        # response = {'data':{'id': 'project_auto62494'}}
        return response
    
    def getSubnets(self):
        region = self.config['cloudformationInfo']['region']
        public_subnet_ids = self.config['workshopResource']['PublicSubnet']
        private_subnet_ids = self.config['workshopResource']['PrivateSubnet']
        if region == 'ca-central-1':
            new_public_subnet_ids = []
            new_private_subnet_ids = []
            for each_public in public_subnet_ids:
                public_response = ec2.describe_subnets(region, each_public)
                public_az = public_response['Subnets'][0]['AvailabilityZone']
                if public_az != 'ca-central-1d':
                    new_public_subnet_ids.append(each_public)
            for each_private in private_subnet_ids:
                private_response = ec2.describe_subnets(region, each_private)
                private_az = private_response['Subnets'][0]['AvailabilityZone']
                if private_az != 'ca-central-1d':
                    new_private_subnet_ids.append(each_private)
            return new_public_subnet_ids, new_private_subnet_ids
        return public_subnet_ids, private_subnet_ids

    def create_pipeline(self, project_id, sink_type='kinesis', redshift_type='serverless'):
        api_info = self.get_api_info('create_pipeline')
        data = api_info['data']
        bucket = self.config['workshopResource']['s3Bucket']
        vpc = self.config['workshopResource']['vpcId']
        default_sg = self.config['workshopResource']['default_sg']
        public_subnet_ids = self.config['workshopResource']['PublicSubnet']
        private_subnet_ids = self.config['workshopResource']['PrivateSubnet']
        msk_cluster_name = self.config['msk']['cluster_name']
        msk_cluster_arn = self.config['msk']['cluster_arn']
        provision_redshift_cluster = self.config['provisionRedshift']['clusterIdentifier']
        provision_redshift_dbuser = self.config['provisionRedshift']['dbUser']
        data["projectId"] = project_id
        data["region"] = self.config['stack']['region']
        for tag in data["tags"]:
            if tag["key"] == 'aws-solution/clickstream/project':
                tag["value"] = project_id
        network = data['network']
        network['vpcId'] = vpc
        network['publicSubnetIds'], network['privateSubnetIds'] = self.getSubnets()
        data['bucket']['name'] = bucket
        data['ingestionServer']['loadBalancer']['logS3Bucket']['name'] = bucket
        data['ingestionServer']['sinkType'] = sink_type
        if sink_type == 's3':
            data['ingestionServer']['sinkS3']['sinkBucket']['name'] = bucket
        if sink_type == 'kinesis':
            data['ingestionServer']['sinkKinesis']['sinkBucket']['name'] = bucket
        if sink_type == 'kafka':
            data['ingestionServer']['sinkKafka']['securityGroupId'] = default_sg
            data['ingestionServer']['sinkKafka']['mskCluster']['name'] = msk_cluster_name
            data['ingestionServer']['sinkKafka']['mskCluster']['arn'] = msk_cluster_arn
        data['ingestionServer']['sinkKinesis']['sinkBucket']['name'] = bucket
        data['dataProcessing']['sourceS3Bucket']['name'] = bucket
        data['dataProcessing']['sinkS3Bucket']['name'] = bucket
        data['dataProcessing']['pipelineBucket']['name'] = bucket
        if 'quicksight' in self.config and 'AccountName' in self.config['quicksight']:
            data['reporting']['quickSight']['accountName'] = self.config['quicksight']['AccountName']
        else:
            data['reporting'] = None
        if redshift_type == 'serverless':
            data['dataModeling']['redshift']['provisioned'] = None
            data['dataModeling']['redshift']['newServerless']['network']['vpcId'] = vpc
            data['dataModeling']['redshift']['newServerless']['network']['subnetIds'] = private_subnet_ids
            data['dataModeling']['redshift']['newServerless']['network']['securityGroups'] = [default_sg]
        if redshift_type == 'provision':
            data['dataModeling']['redshift']['newServerless'] = None
            data['dataModeling']['redshift']['provisioned']['clusterIdentifier'] = provision_redshift_cluster
            data['dataModeling']['redshift']['provisioned']['dbUser'] = provision_redshift_dbuser
        
        if data["region"] == 'us-west-1': 
            data['reporting'] = None
            data['dataModeling']['redshift']['newServerless']['network']['subnetIds'] = private_subnet_ids + public_subnet_ids
        if data["region"] == 'sa-east-1': 
            data['reporting'] = None
            data['dataModeling']['redshift'] = None
        response = self.call_api(api_info['method'], api_info['path'], api_info['data'])
        assert response["success"] is True, response
        # response = {'data': {'id': '5aab54fe2be44982b5dd43c19032c34c'}}
        return response

    def get_pipeline_info(self, pipeline_id, project_id):
        api_info = self.get_api_info('get_pipeline')
        url = api_info['path'] + f'/{pipeline_id}?pid={project_id}&refresh=force'
        response = self.call_api(api_info['method'], url)
        assert response["success"] is True, response
        return response

    def delete_project(self, project_id,waiting_time=20, time_interval=30):
        api_info = self.get_api_info('delete_project')
        url = api_info['path'] + f'/{project_id}'
        pipeline_status = self.get_pipeline_status(project_id)
        time_count = 0
        while pipeline_status in ['Creating', 'Updating'] and time_count <= waiting_time:
            print(f'deleting: pipeline status: {pipeline_status}')
            # assert pipeline_status != 'Failed', 'When deleting project, pipeline updating fail! Please check cloudformation for detail!'
            time.sleep(time_interval)
            time_count += 1
            pipeline_status = self.get_pipeline_status(project_id)
        assert pipeline_status in ['Active', 'Failed', 'Warning'], f'Deleting project, pipeline status is {pipeline_status}, fail to delete!!'
        response = self.call_api(api_info['method'], url)
        assert response["success"] is True, response
        return response

    def get_pipeline_by_project(self, project_id):
        api_info = self.get_api_info('get_pipeline')
        url = api_info['path'] + f'/{project_id}?pid={project_id}&refresh=force'
        response = self.call_api(api_info['method'], url)
        assert response["success"] is True, response
        return response
    
    def get_pipeline_status(self, project_id):
        response = self.get_pipeline_by_project(project_id)
        return pipeline.get_pipeline_status(response['data'])

    def add_app(self, project_id):
        api_info = self.get_api_info('add_app')
        data = api_info['data']
        random_id = random.randint(0, 100000)
        data['projectId'] = project_id
        data['appId'] = f'notepad{random_id}'
        data['name'] = f'notepad{random_id}'
        data['"androidPackage"'] = f'com.farmerbb.notepad{random_id}'
        response = self.call_api(api_info['method'], api_info['path'], api_info['data'])
        assert response["success"] is True, response
        # response: {"success":true,"message":"Application created.","data":{"id":"notepad12345"}}
        return response

    def delete_app(self, project_id, app_id):
        api_info = self.get_api_info('delete_app')
        url = api_info['path'] + f'/{app_id}?pid={project_id}'
        response = self.call_api(api_info['method'], url)
        # response: {"success":true,"message":"Application deleted.","data":null}
        assert response["success"] is True, response
        return response

    def get_app(self, app_id, project_id):
        api_info = self.get_api_info('get_app')
        url = api_info['path'] + f'/{app_id}?pid={project_id}'
        response = self.call_api(api_info['method'], url)
        # response: {"success":true,"message":"","data":{"projectId":"project_auto6321","appId":"test_app_name","androidPackage":"com.farmerbb.notepad","pipeline":{"endpoint":"http://Click-Inges-RYXM9CZUGH50-1431171669.ap-northeast-1.elb.amazonaws.com/collect","dns":"Click-Inges-RYXM9CZUGH50-1431171669.ap-northeast-1.elb.amazonaws.com"}}
        assert response["success"] is True, response
        return response
    
    def ping_services(self, region, services):
        api_info = self.get_api_info('ping_service')
        url = api_info['path'] + f'?region={region}&services={services}'
        response = self.call_api(api_info['method'], url)
        assert response["success"] is True, response
        return response
   





