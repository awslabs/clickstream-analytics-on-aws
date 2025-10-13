# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import botocore
import boto3
import datetime
from dateutil.tz import tzlocal

assume_role_cache: dict = {}

# # usage:
# session = assumed_role_session('arn:aws:iam::ACCOUNTID:role/ROLE_NAME')
# ec2 = session.client('ec2')  # ... etc.

def assumed_role_session(role_arn: str, base_session: botocore.session.Session = None):
    base_session = base_session or boto3.session.Session()._session
    fetcher = botocore.credentials.AssumeRoleCredentialFetcher(
        client_creator=base_session.create_client,
        source_credentials=base_session.get_credentials(),
        role_arn=role_arn,
        extra_args={
            'RoleSessionName': None
        }
    )
    creds = botocore.credentials.DeferredRefreshableCredentials(
        method='assume-role',
        refresh_using=fetcher.fetch_credentials,
        time_fetcher=lambda: datetime.datetime.now(tzlocal())
    )
    botocore_session = botocore.session.Session()
    botocore_session._credentials = creds
    return boto3.Session(botocore_session=botocore_session)


def get_aws_account_from_profile():
    sts_client = boto3.client('sts')
    response = sts_client.get_caller_identity()
    print('get_aws_account_from_profile: ', response)
    aws_account = response['Account']
    return aws_account
