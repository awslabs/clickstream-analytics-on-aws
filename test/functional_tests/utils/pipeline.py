
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

def get_pipeline_status(pipeline):
    status = None
    if 'statusType' in pipeline: 
        status = pipeline['statusType']
    elif 'status' in pipeline:
        status = pipeline['status']['status']
    return status


def get_pipeline_stackDetails(pipeline):
    stackDetails = []
    if 'stackDetails' in pipeline: 
        stackDetails = pipeline['stackDetails']
    elif 'status' in pipeline:
        stackDetails = pipeline['status']['stackDetails']
    return stackDetails

def get_redshift_event_table(pipeline):
    schema_version_v1 = ['v1.0.0', 'v1.0.1', 'v1.0.2', 'v1.0.3']
    schema_version_v2 = ['v1.1.0', 'v1.1.1', 'v1.1.2', 'v1.1.3', 'v1.1.4', 'v1.1.5']
    version = pipeline['templateVersion'].split('-')[0]
    table_name = 'event_v2'
    if version in schema_version_v1:
        table_name = 'ods_event'
    elif version in schema_version_v2:
        table_name = 'event'
    return table_name

