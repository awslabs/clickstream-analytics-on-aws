
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import os
import pytest
import boto3
import yaml
from utils import config_parse, quicksight
from utils import cloudformation as cloudformationUtil


@pytest.fixture(scope="session")
def get_config(opt_region, opt_environment, opt_stack_name):
    file_location = 'cases/config.yml'    
    config = config_parse.config_parser(file_location)
    region = opt_region 
    environment = opt_environment
    stack_name = opt_stack_name
    print('get_config: ', region, environment)

    # Get main stack
    # nightswatch: tCaT-cs-cloudfront-s3
    # autotest: clickstream-develop
    # local: Custom stack name
    main_stack_name = stack_name if environment == "local" else get_main_stack_name(region, environment)
    print('main_stack_name: ', main_stack_name)
   
    workshop_stack_name = config['workshopStack']['stackName']
    cloudformation = get_cloudformation_info(main_stack_name, region)
    workshop_resource = get_workshop_resources(workshop_stack_name, region)
    quicksight_resources = get_quicksight_resources(region)
    def apply_existing(data, key, new_data):
        if data.get(key):
            data[key].update(new_data)
        else:
            data[key] = new_data
        return data

    with open(file_location) as f:
        dic_temp = yaml.safe_load(f)
        for resource_key, resource_data in {
            'cloudformationInfo': cloudformation,
            'workshopResource': workshop_resource,
            'quicksight': quicksight_resources
        }.items():
            dic_temp = apply_existing(dic_temp, resource_key, resource_data)
        dic_temp['environment'] = environment
        dic_temp['stack']['stackName'] = main_stack_name
        dic_temp['stack']['region'] = region

    with open(file_location, 'w') as f:
        yaml.dump(dic_temp, f)
    config_new = config_parse.config_parser(file_location)
    print(f"CONFIGS: \n {config_new}")
    return config_new

def get_main_stack_name(region, environment):
    print('get_main_stack_name: ', region, environment)
    main_stack_name = ''
    stack_all = cloudformationUtil.list_all_stacks(region)
    for stack in stack_all:
        print(stack['StackId'], stack['StackStatus'])
        if stack['StackStatus'] not in ['CREATE_COMPLETE', 'UPDATE_COMPLETE']:
            continue
        if environment == 'nightswatch' and 'tcat-cs-cloudfront-s3' in stack['StackName'].lower():
            main_stack_name = stack['StackName']
            break
        elif environment == 'autotest' and 'clickstream-develop' in stack['StackName'].lower():
            main_stack_name = stack['StackName']
            break
    if not main_stack_name:
        pytest.skip("no create completed stack, pytest exiting")
    return main_stack_name

def get_cloudformation_info(stack_name, region):
    cf_client = boto3.client('cloudformation', region_name=region)
    response = cf_client.describe_stacks(StackName=stack_name)
    resources = cloudformationUtil.list_all_stack_resources(region, stack_name)
    cloudformation = {}
    cloudformation['region'] = region
    for resource in resources:
        if 'AWS::Cognito::UserPoolClient' == resource['ResourceType']:
            client_id = resource['PhysicalResourceId']
            cloudformation['UserPoolClientId'] = client_id
        if 'AWS::Cognito::UserPoolUser' == resource['ResourceType']:
            user = resource['PhysicalResourceId']
            cloudformation['UserPoolUser'] = user
        if 'AWS::Cognito::UserPool' == resource['ResourceType']:
            user_pool_id = resource['PhysicalResourceId']
            cloudformation['UserPoolId'] = user_pool_id
    outputs = response["Stacks"][0]["Outputs"]
    if outputs:
        for output in outputs:
            if 'ClickStreamApiEndpoint' in output['OutputKey']:
                cloudformation['ClickStreamApiEndpoint'] = output['OutputValue']
                continue
            cloudformation[output['OutputKey']] = output['OutputValue']
    return cloudformation

def get_workshop_resources(stack_name, region):
    ec2_client = boto3.client('ec2', region_name=region)
    resources = cloudformationUtil.list_all_stack_resources(region, stack_name)
    cloudformation = {}
    public_subnets = []
    private_subnets = []
    securityGroups = []
    for resource in resources:
        if 'AWS::S3::Bucket' == resource['ResourceType']:
            bucket = resource['PhysicalResourceId']
            cloudformation['s3Bucket'] = bucket
        if 'AWS::EC2::VPC' == resource['ResourceType']:
            vpc = resource['PhysicalResourceId']
            cloudformation['vpcId'] = vpc
            response = ec2_client.describe_security_groups(
                Filters=[{'Name': 'vpc-id', 'Values': [vpc]}, {'Name': 'group-name', 'Values': ['default']}])
            default_security_group = response['SecurityGroups'][0]['GroupId']
            cloudformation['default_sg'] = default_security_group
        if 'AWS::EC2::Subnet' == resource['ResourceType'] and 'PublicSubnet' in resource['LogicalResourceId']:
            public_subnet_id = resource['PhysicalResourceId']
            public_subnets.append(public_subnet_id)
        if 'AWS::EC2::Subnet' == resource['ResourceType'] and 'PrivateSubnet' in resource['LogicalResourceId']:
            private_subnet_id = resource['PhysicalResourceId']
            private_subnets.append(private_subnet_id)
        if 'AWS::EC2::SecurityGroup' == resource['ResourceType']:
            SecurityGroup = resource['PhysicalResourceId']
            securityGroups.append(SecurityGroup)
    if private_subnets:
        cloudformation['PrivateSubnet'] = private_subnets
    if public_subnets:
        cloudformation['PublicSubnet'] = public_subnets
    if securityGroups:
        cloudformation['securityGroup'] = securityGroups
    return cloudformation

def get_quicksight_resources(region):
    quicksight_resources = {}
    response = quicksight.quicksight_account_subscription(region)
    quicksight_resources['AccountName'] = response['AccountInfo']['AccountName']
    return quicksight_resources

def init_cognito(get_config, region):
    # change password
    client = boto3.client('cognito-idp', region_name=region)
    user_pool_id = get_config['cloudformationInfo']['UserPoolId']
    username = get_config['cloudformationInfo']['UserPoolUser']
    password = get_config['stack']['UserPoolPassd']
    app_client_id = get_config['cloudformationInfo']['UserPoolClientId']
    callback_url = get_config['cloudformationInfo']['ControlPlaneURL']
    auth_flows =  [
    'ALLOW_ADMIN_USER_PASSWORD_AUTH',
    'ALLOW_CUSTOM_AUTH',
    'ALLOW_REFRESH_TOKEN_AUTH',
    'ALLOW_USER_PASSWORD_AUTH',
    'ALLOW_USER_SRP_AUTH']
    # 360 minutes converted to seconds
    access_token_duration = 21600
    id_token_duration = 21600 
    try:
        response = client.admin_set_user_password(
            UserPoolId=user_pool_id,
            Username=username,
            Password=password,
            Permanent=True
        )
        print("Password modified successfully")
    except client.exceptions.UserNotFoundException:
        print("User not found")
    except client.exceptions.InvalidParameterException as e:
        print(f"Invalid parameters: {str(e)}")
    except Exception as e:
        print(f"Error modifying password: {str(e)}")
    # update the authentication flows for user pool app client
    try:
        # update TokenValidity
        response = client.update_user_pool_client(
            UserPoolId=user_pool_id,
            ClientId=app_client_id,
            AccessTokenValidity=access_token_duration,
            IdTokenValidity=id_token_duration,        
            TokenValidityUnits={'AccessToken': 'seconds','IdToken': 'seconds'},
            ExplicitAuthFlows=['ALLOW_USER_SRP_AUTH', 'ALLOW_USER_PASSWORD_AUTH', 
            'ALLOW_CUSTOM_AUTH', 'ALLOW_ADMIN_USER_PASSWORD_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
            AllowedOAuthFlowsUserPoolClient=True,
            SupportedIdentityProviders=['COGNITO'],
            AllowedOAuthFlows=['code', 'implicit'],
            AllowedOAuthScopes=['email','openid', 'profile'],
            CallbackURLs= ['https://example.com/callback', f'{callback_url}/signin'],
            EnableTokenRevocation=True
        )
        print("Authentication flows updated successfully")
    except client.exceptions.InvalidParameterException as e:
        print(f"Invalid parameters: {str(e)}")
    except Exception as e:
        print(f"Error updating authentication flows: {str(e)}")
    

@pytest.fixture(scope="session")
def get_token(get_config, opt_region):
    # init cognito
    region = opt_region
    init_cognito(get_config, region)
    # generate token
    client = boto3.client('cognito-idp', region_name=region)
    resp = client.initiate_auth(
        ClientId=get_config['cloudformationInfo']['UserPoolClientId'],
        AuthFlow='USER_PASSWORD_AUTH',
        AuthParameters={
            "USERNAME": get_config['cloudformationInfo']['UserPoolUser'],
            "PASSWORD": get_config['stack']['UserPoolPassd']
        }
    )
    token = resp['AuthenticationResult']['IdToken']
    return token

@pytest.fixture(scope="session")
def opt_region(request):
    return request.config.getoption("--region")

@pytest.fixture(scope="session")
def opt_environment(request):
    # autotest OR nightswatch
    return request.config.getoption("--environment")

@pytest.fixture(scope="session")
def opt_stack_name(request):
    return request.config.getoption("--stack_name")