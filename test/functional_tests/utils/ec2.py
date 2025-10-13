# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3


def describe_subnets(region, subnetId):
    ec2_client = boto3.client('ec2', region_name=region)
    response = ec2_client.describe_subnets(SubnetIds=[subnetId])
    return response



