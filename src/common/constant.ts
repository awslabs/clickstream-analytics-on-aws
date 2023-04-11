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

export const SUBNETS_PATTERN = 'subnet-[a-f0-9]+,(subnet-[a-f0-9]+,?)+';
export const DOMAIN_NAME_PATTERN = '[a-z0-9A-Z#$&@_%~\\*\\.\\-]+\\.[a-zA-Z0-9]{2,6}';
export const IP_PATTERN = '((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})(\\.((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})){3}';
export const HOST_ZONE_ID_PATTERN = '^Z[A-Z0-9]+$';
export const RECORD_NAME_PARRERN = '^[a-zA-Z0-9\\-_]{1,63}$';
export const VPC_ID_PARRERN = '^vpc-[a-f0-9]+$';
export const IAM_CERTIFICATE_ID_PARRERN = '^[A-Z0-9]+$';
export const EMAIL_PARRERN = '\\w[-\\w.+]*@([A-Za-z0-9][-A-Za-z0-9]+\\.)+[A-Za-z]{2,14}';
export const S3_BUCKET_NAME_PATTERN = '[a-z0-9\\.\\-]{3,63}';
export const PROJECT_ID_PATTERN = '[a-z][a-z0-9_]{0,126}';
export const APP_ID_PATTERN = '[a-zA-Z][a-zA-Z0-9_]{0,126}';

export const PARAMETER_GROUP_LABEL_VPC = 'VPC Information';
export const PARAMETER_GROUP_LABEL_DOMAIN = 'Domain Information';
export const PARAMETER_GROUP_LABEL_OIDC = 'OpenID Connector Information';
export const PARAMETER_LABEL_VPCID = 'VPC ID';
export const PARAMETER_LABEL_PUBLIC_SUBNETS = 'Public Subnet IDs';
export const PARAMETER_LABEL_PRIVATE_SUBNETS = 'Private Subnet IDs';
export const PARAMETER_LABEL_HOST_ZONE_ID = 'Host Zone ID';
export const PARAMETER_LABEL_HOST_ZONE_NAME = 'Host Zone Name';
export const PARAMETER_LABEL_RECORD_NAME = 'Record Name';
export const PARAMETER_LABEL_DOMAIN_NAME = 'Domain Name';
export const PARAMETER_LABEL_CERTIFICATE_ARN = 'Certificate ARN';
export const KAFKA_BROKERS_PATTERN = `(((${DOMAIN_NAME_PATTERN}|${IP_PATTERN})(:[0-9]+){1},?)){1,}`;
export const KAFKA_TOPIC_PATTERN = '[a-zA-Z0-9_\\-\\.]+';
export const OIDC_ISSUER_PATTERN = '(https):\\/\\/[\\w\\-_]+(\\.[\\w\\-_]+)+([\\w\\-\\.,@?^=%&:/~\\+#]*[\\w\\-\\@?^=%&/~\\+#])?';
export const OIDC_CLIENT_ID_PATTERN = '^[^ ]+$';
export const PARAMETER_LABEL_OIDC_ISSUER = 'OpenID Connector Issuer';
export const PARAMETER_LABEL_OIDC_CLIENT_ID = 'OpenID Connector Client Id';


/**
 * check mapping from doc https://docs.aws.amazon.com/elasticloadbalancing/latest/classic/enable-access-logs.html#attach-bucket-policy
 */

export const ALBLogServiceAccountMapping = {
  mapping: {
    'me-south-1': {
      account: '076674570225',
    },
    'eu-south-1': {
      account: '635631232127',
    },
    'ap-northeast-1': {
      account: '582318560864',
    },
    'ap-northeast-2': {
      account: '600734575887',
    },
    'ap-northeast-3': {
      account: '383597477331',
    },
    'ap-south-1': {
      account: '718504428378',
    },
    'ap-southeast-1': {
      account: '114774131450',
    },
    'ap-southeast-2': {
      account: '783225319266',
    },
    'ca-central-1': {
      account: '985666609251',
    },
    'eu-central-1': {
      account: '054676820928',
    },
    'eu-north-1': {
      account: '897822967062',
    },
    'eu-west-1': {
      account: '156460612806',
    },
    'eu-west-2': {
      account: '652711504416',
    },
    'eu-west-3': {
      account: '009996457667',
    },
    'sa-east-1': {
      account: '507241528517',
    },
    'us-east-1': {
      account: '127311923021',
    },
    'us-east-2': {
      account: '033677994240',
    },
    'us-west-1': {
      account: '027434742980',
    },
    'us-west-2': {
      account: '797873946194',
    },
    'ap-east-1': {
      account: '754344448648',
    },
    'af-south-1': {
      account: '098369216593',
    },
    'ap-southeast-3': {
      account: '589379963580',
    },
    'cn-north-1': {
      account: '638102146993',
    },
    'cn-northwest-1': {
      account: '037604701340',
    },
  },
};

export const PARAMETER_LABEL_OIDC_JWKS_SUFFIX = 'OpenID Connector Jwks Uri Suffix';
export const OIDC_JWKS_SUFFIX_PATTERN = '^/[^ ]+$';
export const MUTIL_APP_ID_PATTERN = `${APP_ID_PATTERN}(,${APP_ID_PATTERN})*`;

// ods data partitions
export const PARTITION_APP = 'partition_app';
export const TABLE_NAME_ODS_EVENT = 'ods_events';
export const TABLE_NAME_INGESTION = 'ingestion_events';
// Metrics
export const METRIC_NAMESPACE_DATAPIPELINE = 'Clickstream/DataPipeline ETL';
