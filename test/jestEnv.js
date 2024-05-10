/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */

// solution
const SOLUTION_VERSION='v1.0.0_dev'

// web console backend API
process.env.AWS_REGION = 'us-east-1'
process.env.AWS_ACCOUNT_ID = '555555555555'
process.env.AWS_URL_SUFFIX = 'amazonaws.com'
process.env.S3_MAIN_REGION = 'us-east-1'
process.env.STACK_WORKFLOW_S3_BUCKET = 'TEST_EXAMPLE_BUCKET'
process.env.WITH_AUTH_MIDDLEWARE = 'false'
process.env.WITH_VALIDATE_ROLE = 'false'
process.env.PREFIX_TIME_GSI_NAME = 'prefix-time-gsi-name'
process.env.PREFIX_MONTH_GSI_NAME = 'prefix-month-gsi-name'
process.env.CLICK_STREAM_TABLE_NAME = 'click-stream-table-name'
process.env.ANALYTICS_METADATA_TABLE_NAME = 'analytics-metadata-table-name'
process.env.DICTIONARY_TABLE_NAME = 'dictionary-table-name'
process.env.QUICKSIGHT_EMBED_ROLE_ARN = 'arn:aws:iam::555555555555:role/QuickSightEmbeddingRole'
process.env.FULL_SOLUTION_VERSION = 'v1.1.6-202311200542_dev'
process.env.LISTEN_STACK_QUEUE_ARN = 'arn:aws:sqs:us-east-1:555555555555:queue-8ddb6980'
process.env.IAM_ROLE_PREFIX = 'test-prefix'
process.env.IAM_ROLE_BOUNDARY_ARN = ''
process.env.TEMPLATE_FILE = 'cloudfront-s3-control-plane-stack-global.template.json'
process.env.SOLUTION_VERSION = 'v1.1.5-202403071513'
process.env.LOG_LEVEL = 'ERROR'


// env variables for analytics stack
process.env.PROJECT_ID='project1'
process.env.DYNAMODB_TABLE_NAME='project1_ods_events_trigger'
process.env.DYNAMODB_TABLE_INDEX_NAME='by_status'
process.env.S3_FILE_SUFFIX='.parquet.snappy'
process.env.QUERY_RESULT_LIMIT='6'
process.env.MANIFEST_BUCKET='EXAMPLE-BUCKET-1'
process.env.MANIFEST_BUCKET_PREFIX='manifest/workdir/'
process.env.ODS_EVENT_BUCKET='EXAMPLE-BUCKET-2'
process.env.ODS_EVENT_BUCKET_PREFIX='project1/raw/'
process.env.REDSHIFT_ODS_TABLE_NAME='ods_external_events'
process.env.REDSHIFT_ROLE = 'arn:aws:iam::xxxxxxxxxxxx:role/redshift-serverless-s3-copyrole'
process.env.METADATA_DDB_TABLE_ARN = 'arn:aws:dynamodb:us-east-1:111122223333:table/ClickstreamAnalyticsMetadata';
process.env.CLICKSTREAM_METADATA_DDB_ARN = 'arn:aws:dynamodb:us-east-1:123456789012:table/ClickStreamApiClickstreamMetadata';
process.env.WORKFLOW_INFO_DDB_TABLE_ARN = 'arn:aws:dynamodb:us-east-1:111122223333:table/ScanMetadataWorkflowInfo';
process.env.PIPELINE_S3_BUCKET_NAME = 'test-pipe-line-bucket';
process.env.PIPELINE_S3_PREFIX = 'pipeline-prefix/';
process.env.REDSHIFT_DATABASE = 'project1'
process.env.APP_IDS = 'app1,app2'
process.env.REDSHIFT_MODE = 'Serverless';
process.env.REDSHIFT_SERVERLESS_WORKGROUP_NAME = 'workgroup-test';
process.env.DATA_REFRESHNESS_IN_HOUR = '72';
process.env.REFRESH_STATE_MACHINE_ARN = 'arn:aws:states:us-east-1:111122223333:workflow/abc'

process.env.TIMEZONE_WITH_APPID_LIST = '[{"appId":"app1","timezone":"America/Noronha"},{"appId":"app2","timezone":"Asia/Shanghai"}]'

process.env.REFRESH_MODE = 'all'

// streaming ingestion
process.env.STATE_MACHINE_ARN= 'arn:aws:states:us-east-1:111122223333:workflow/abc'
process.env.S3_BUCKET = 'test-pipe-line-bucket';
process.env.S3_PREFIX = 'pipeline-prefix/';

process.env.IS_SKIP_VPC_CONNECTION_FORCE_WAITING = 'true'

// env variables for ingestion stack
process.env.PING_PATH = '/ping'

