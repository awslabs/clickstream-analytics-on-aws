# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import boto3

from utils.sts import get_aws_account_from_profile


def quicksight_account_subscription(region):
    quicksight_region = 'cn-northwest-1' if region.startswith('cn') else 'us-east-1'
    qs_client = boto3.client('quicksight', region_name=quicksight_region)
    accountId = get_aws_account_from_profile()
    response = qs_client.describe_account_subscription(
        AwsAccountId=accountId
    )
    return response
