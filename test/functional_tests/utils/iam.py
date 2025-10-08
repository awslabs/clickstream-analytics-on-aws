# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3

iam_client = boto3.client('iam')



def get_role_arn_by_rolename(role_name):
    response = iam_client.get_role(RoleName=role_name)
    return response['Role']['Arn']
    