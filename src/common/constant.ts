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

export const ServerlessRedshiftRPUByRegionMapping = {
  'me-south-1': {
    min: 0,
    max: 0,
  },
  'eu-south-1': {
    min: 0,
    max: 0,
  },
  'ap-northeast-1': {
    min: 8,
    max: 512,
  },
  'ap-northeast-2': {
    min: 32,
    max: 512,
  },
  'ap-northeast-3': {
    min: 0,
    max: 0,
  },
  'ap-south-1': {
    min: 32,
    max: 512,
  },
  'ap-southeast-1': {
    min: 8,
    max: 512,
  },
  'ap-southeast-2': {
    min: 8,
    max: 512,
  },
  'ca-central-1': {
    min: 32,
    max: 512,
  },
  'eu-central-1': {
    min: 8,
    max: 512,
  },
  'eu-north-1': {
    min: 32,
    max: 512,
  },
  'eu-west-1': {
    min: 8,
    max: 512,
  },
  'eu-west-2': {
    min: 32,
    max: 512,
  },
  'eu-west-3': {
    min: 32,
    max: 512,
  },
  'sa-east-1': {
    min: 0,
    max: 0,
  },
  'us-east-1': {
    min: 8,
    max: 512,
  },
  'us-east-2': {
    min: 8,
    max: 512,
  },
  'us-west-1': {
    min: 32,
    max: 512,
  },
  'us-west-2': {
    min: 8,
    max: 512,
  },
  'ap-east-1': {
    min: 0,
    max: 0,
  },
  'af-south-1': {
    min: 0,
    max: 0,
  },
  'ap-southeast-3': {
    min: 0,
    max: 0,
  },
  'cn-north-1': {
    min: 8,
    max: 512,
  },
  'cn-northwest-1': {
    min: 8,
    max: 512,
  },
};

export const SERVICE_CATALOG_SUPPORTED_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'af-south-1',
  'ap-east-1',
  'ap-south-1',
  'ap-south-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-southeast-4',
  'ca-central-1',
  'eu-central-1',
  'eu-central-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-south-1',
  'eu-south-2',
  'eu-north-1',
  'me-south-1',
  'me-central-1',
  'sa-east-1',
];

// regex patterns
export const SUBNETS_PATTERN = 'subnet-[a-f0-9]+,(subnet-[a-f0-9]+,?)+';
export const SECURITY_GROUP_PATTERN = 'sg-[a-f0-9]+';
export const MULTI_SECURITY_GROUP_PATTERN = `${SECURITY_GROUP_PATTERN}(,${SECURITY_GROUP_PATTERN})*`;
export const DOMAIN_NAME_PATTERN =
  '[a-z0-9A-Z#$&@_%~\\*\\.\\-]+\\.[a-zA-Z]{2,63}';
export const IP_PATTERN =
  '((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})(\\.((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})){3}';
export const HOST_ZONE_ID_PATTERN = '^Z[A-Z0-9]+$';
export const RECORD_NAME_PATTERN = '^[a-zA-Z0-9\\-_]{1,63}$';
export const VPC_ID_PATTERN = '^vpc-[a-f0-9]+$';
export const IAM_CERTIFICATE_ID_PATTERN = '^[A-Z0-9]+$';
export const S3_BUCKET_NAME_PATTERN = '[a-z0-9\\.\\-]{3,63}';
export const S3_PREFIX_PATTERN = '^(|[^/].*/)$';
export const PROJECT_ID_PATTERN = '[a-z][a-z0-9_]{0,126}';
export const APP_ID_PATTERN = '[a-zA-Z][a-zA-Z0-9_]{0,126}';
export const KAFKA_BROKERS_PATTERN = `(((${DOMAIN_NAME_PATTERN}|${IP_PATTERN})(:[0-9]+){1},?)){1,}`;
export const KAFKA_TOPIC_PATTERN = '[a-zA-Z0-9_\\-\\.]+';
export const OIDC_ISSUER_PATTERN =
  '(https):\\/\\/[\\w\\-_]+(\\.[\\w\\-_]+)+([\\w\\-\\.,@?^=%&:/~\\+#]*[\\w\\-\\@?^=%&/~\\+#])?';
export const OIDC_CLIENT_ID_PATTERN = '^[^ ]+$';
export const OIDC_JWKS_SUFFIX_PATTERN = '^/[^ ]+$';
export const MULTI_APP_ID_PATTERN = `^((${APP_ID_PATTERN})(,${APP_ID_PATTERN}){0,})?$`;
export const EMAIL_BASE_PATTERN =
  '\\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*';
export const EMAIL_PATTERN =
  `^(?=.{0,320}$)${EMAIL_BASE_PATTERN}`;
export const MULTI_EMAIL_PATTERN = `^(?=(?:[^,]{0,320},)*[^,]{0,320}$)\\s*${EMAIL_BASE_PATTERN}\\s*(?:,\\s*${EMAIL_BASE_PATTERN}\\s*)*$`;
export const POSITIVE_INTEGERS = '^[1-9]\\d*';
export const S3_PATH_PLUGIN_JARS_PATTERN = `^(s3://${S3_BUCKET_NAME_PATTERN}/[^,]+.jar,?){0,}$`;
export const S3_PATH_PLUGIN_FILES_PATTERN = `^(s3://${S3_BUCKET_NAME_PATTERN}/[^,]+,?){0,}$`;
export const SUBNETS_THREE_AZ_PATTERN =
  'subnet-[a-f0-9]+,(subnet-[a-f0-9]+,?){2,}';
export const QUICKSIGHT_USER_NAME_PATTERN =
  '^[A-Za-z0-9][A-Za-z0-9/_@.\\-]+[A-Za-z0-9]$';
export const QUICKSIGHT_NAMESPACE_PATTERN = '^([A-Za-z])[A-Za-z0-9]{4,63}$';
export const REDSHIFT_DB_NAME_PATTERN = `^${PROJECT_ID_PATTERN}$`;
export const REDSHIFT_DB_USER_NAME_PATTERN = '^([a-zA-Z][a-zA-Z0-9-_]{1,63})?$';
export const REDSHIFT_CLUSTER_IDENTIFIER_PATTERN = '^([a-zA-Z][a-zA-Z0-9-_]{1,63})?$';
export const SECRETS_MANAGER_ARN_PATTERN =
  '^$|^arn:aws(-cn|-us-gov)?:secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[a-zA-Z0-9-\/]+$';
export const DDB_TABLE_ARN_PATTERN =
  '^arn:aws(-cn|-us-gov)?:dynamodb:[a-z0-9-]+:[0-9]{12}:table\/[a-zA-Z0-9_.-]+$';
export const SERVICE_CATALOG_APPREGISTRY_ARN_PATTERN = 'arn:aws(-cn|-us-gov)?:servicecatalog:[a-z0-9-]+:[0-9]{12}:\/applications\/[a-zA-Z0-9_.-]+';
export const SCHEDULE_EXPRESSION_PATTERN =
  '^(rate\\(\\s*\\d+\\s+(hour|minute|day)s?\\s*\\))|(cron\\(.*\\))$';

export const CORS_ORIGIN_DOMAIN_PATTERN = '(?:\\*\\.)?[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\\.?';
export const CORS_ORIGIN = `(https?:\\/\\/){1}(localhost|${IP_PATTERN}|${CORS_ORIGIN_DOMAIN_PATTERN})(:[0-9]{2,5})?`;
export const CORS_PATTERN = `^$|^\\*$|^(${CORS_ORIGIN}(,\\s*${CORS_ORIGIN})*)$`;

export const STACK_CORS_ORIGIN_DOMAIN_PATTERN = '(?:\\.\\*\\\\.)?[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\\\\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\\.?';
export const STACK_CORS_ORIGIN = `(https?:\\/\\/){1}(localhost|${IP_PATTERN}|${STACK_CORS_ORIGIN_DOMAIN_PATTERN})(:[0-9]{2,5})?`;
export const STACK_CORS_PATTERN = `^$|^(\\.\\*)$|^(${STACK_CORS_ORIGIN}(\\|${STACK_CORS_ORIGIN})*)$`;

export const XSS_PATTERN = '<(?:"[^"]*"[\'"]*|\'[^\']*\'[\'"]*|[^\'">])+(?<!/\s*)>';
export const REGION_PATTERN = '[a-z]{2}-[a-z0-9]{1,10}-[0-9]{1}';
export const EMR_VERSION_PATTERN='^emr-[0-9]+\\.[0-9]+\\.[0-9]+$';

export const METADATA_EVENT_NAME_PATTERN = '[a-z][a-z0-9_]{0,64}';

export const QUICKSIGHT_USER_ARN_PATTERN =
  '^$|^arn:aws(-cn|-us-gov)?:quicksight:[a-z0-9-]+:[0-9]{12}:user/([A-Za-z])[A-Za-z0-9]{4,63}/[A-Za-z0-9][A-Za-z0-9/_@.\\-]+[A-Za-z0-9]$';

// cloudformation parameters
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
export const PARAMETER_LABEL_OIDC_ISSUER = 'OpenID Connector Issuer';
export const PARAMETER_LABEL_OIDC_CLIENT_ID = 'OpenID Connector Client Id';
export const PARAMETER_LABEL_OIDC_JWKS_SUFFIX =
  'OpenID Connector Jwks Uri Suffix';

// ods data partitions
export const PARTITION_APP = 'partition_app';
export const TABLE_NAME_INGESTION = 'ingestion_events';
export const TABLE_NAME_EVENT = 'event';
export const TABLE_NAME_EVENT_PARAMETER = 'event_parameter';
export const TABLE_NAME_USER = 'user';
export const TABLE_NAME_ITEM= 'item';

// the outputs of stacks
export const OUTPUT_CONTROL_PLANE_URL = 'ControlPlaneURL';
export const OUTPUT_CONTROL_PLANE_BUCKET = 'ControlPlaneBucket';
export const OUTPUT_INGESTION_SERVER_DNS_SUFFIX = 'IngestionServerDNS';
export const OUTPUT_INGESTION_SERVER_URL_SUFFIX = 'IngestionServerURL';
export const OUTPUT_DATA_PROCESSING_EMR_SERVERLESS_APPLICATION_ID_SUFFIX =
  'EMRServerlessApplicationId';
export const OUTPUT_DATA_PROCESSING_GLUE_DATABASE_SUFFIX = 'GlueDatabase';
export const OUTPUT_DATA_PROCESSING_GLUE_EVENT_TABLE_SUFFIX = 'GlueEventTable';
export const OUTPUT_DATA_PROCESSING_GLUE_EVENT_PARAMETER_TABLE_SUFFIX='GlueEventParameterTable';
export const OUTPUT_DATA_PROCESSING_GLUE_USER_TABLE_SUFFIX = 'GlueUserTable';
export const OUTPUT_DATA_PROCESSING_GLUE_ITEM_TABLE_SUFFIX = 'GlueItemTable';

export const OUTPUT_REPORT_DASHBOARDS_SUFFIX = 'Dashboards';
export const OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_NAME =
  'StackCreatedRedshiftServerlessWorkgroupName';
export const OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_ADDRESS =
  'StackCreatedRedshiftServerlessWorkgroupEndpointAddress';
export const OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_WORKGROUP_ENDPOINT_PORT =
  'StackCreatedRedshiftServerlessWorkgroupEndpointPort';
export const OUTPUT_DATA_MODELING_REDSHIFT_SERVERLESS_NAMESPACE_NAME =
  'StackCreatedRedshiftServerlessNamespaceName';
export const OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_CREDENTIAL_PARAMETER_SUFFIX =
  'BIUserCredentialParameterName';
export const OUTPUT_DATA_MODELING_REDSHIFT_BI_USER_NAME_SUFFIX =
  'BIUserName';
export const OUTPUT_DATA_MODELING_REDSHIFT_DATA_API_ROLE_ARN_SUFFIX =
  'RedshiftDataApiRoleArn';
export const OUTPUT_REPORTING_QUICKSIGHT_DATA_SOURCE_ARN =
  'DataSourceArn';
export const OUTPUT_REPORTING_QUICKSIGHT_DASHBOARDS =
  'Dashboards';

export const OUTPUT_METRICS_OBSERVABILITY_DASHBOARD_NAME =
  'ObservabilityDashboardName';
export const OUTPUT_METRICS_SNS_TOPIC_ARN_NAME = 'ObservabilityTopicArn';

export const OUTPUT_SERVICE_CATALOG_APPREGISTRY_APPLICATION_ARN = 'ServiceCatalogAppRegistryApplicationArn';

export const DATA_PROCESSING_APPLICATION_NAME_PREFIX = 'Clickstream';

export const CUSTOM_RESOURCE_RESPONSE_REDSHIFT_BI_USER_NAME =
  'RedshiftBIUsername';

// Metrics
export const METRICS_PARAMETER_PATH_PREFIX = '/Clickstream/metrics/';
export const ALARM_NAME_PREFIX = 'Clickstream';

export const DEFAULT_SOLUTION_OPERATOR = 'Clickstream';
export const DEFAULT_DASHBOARD_NAME = 'User lifecycle';

export const TRANSFORMER_AND_ENRICH_CLASS_NAMES = 'software.aws.solution.clickstream.TransformerV2,software.aws.solution.clickstream.UAEnrichment,software.aws.solution.clickstream.IPEnrichment';

export const EVENT_SOURCE_LOAD_DATA_FLOW = 'LoadDataFlow';

export const EMR_ARCHITECTURE_AUTO = 'Auto';

export const CLICKSTREAM_RETENTION_VIEW_PLACEHOLDER = 'Retention_View';
export const CLICKSTREAM_SESSION_VIEW_PLACEHOLDER = 'Session_View';
export const CLICKSTREAM_USER_DIM_VIEW_PLACEHOLDER = 'User_Dim_View';
export const CLICKSTREAM_EVENT_VIEW_PLACEHOLDER = 'Event_View';
export const CLICKSTREAM_DEVICE_VIEW_PLACEHOLDER = 'Device_View';
export const CLICKSTREAM_EVENT_PARAMETER_VIEW_PLACEHOLDER = 'Event_Parameter_View';
export const CLICKSTREAM_LIFECYCLE_DAILY_VIEW_PLACEHOLDER = 'Lifecycle_Daily_View';
export const CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_PLACEHOLDER = 'Lifecycle_Weekly_View';
export const CLICKSTREAM_USER_ATTR_VIEW_PLACEHOLDER = 'User_Attr_View';

export const CLICKSTREAM_RETENTION_VIEW_NAME = 'clickstream_retention_view_v1';
export const CLICKSTREAM_SESSION_VIEW_NAME = 'clickstream_session_view_v1';
export const CLICKSTREAM_USER_DIM_VIEW_NAME = 'clickstream_user_dim_view_v1';
export const CLICKSTREAM_USER_FIRST_ATTR_VIEW_NAME = 'clickstream_user_first_attr_view_v1';
export const CLICKSTREAM_EVENT_VIEW_NAME = 'clickstream_event_view_v1';
export const CLICKSTREAM_DEVICE_VIEW_NAME = 'clickstream_device_view_v1';
export const CLICKSTREAM_EVENT_PARAMETER_VIEW_NAME = 'clickstream_event_parameter_view_v1';
export const CLICKSTREAM_LIFECYCLE_DAILY_VIEW_NAME = 'clickstream_lifecycle_daily_view_v1';
export const CLICKSTREAM_LIFECYCLE_WEEKLY_VIEW_NAME = 'clickstream_lifecycle_weekly_view_v1';
export const CLICKSTREAM_USER_ATTR_VIEW_NAME = 'clickstream_user_attr_view_v1';

export const QUICKSIGHT_RESOURCE_NAME_PREFIX = 'clickstream';
export const QUICKSIGHT_TEMP_RESOURCE_NAME_PREFIX = '_tmp_';
export const QUICKSIGHT_DASHBOARD_INFIX= '-dashboard-';
export const QUICKSIGHT_ANALYSIS_INFIX= '-analysis-';
export const QUICKSIGHT_DATASET_INFIX= '-dataset-';
