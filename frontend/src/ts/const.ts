export const COMMON_ALERT_TYPE = {
  Success: 'success',
  Error: 'error',
  Warning: 'warning',
  Info: 'info',
};

export const PROJECT_STAGE_LIST = [
  { label: 'Dev', value: 'Dev' },
  { label: 'Test', value: 'Test' },
  { label: 'Prod', value: 'Prod' },
];

export const AWS_REGION_LIST = [
  { label: 'us-east-1(N.Virginia)', value: 'us-east-1' },
  { label: 'us-east-2(Ohio)', value: 'us-east-2' },
  { label: 'us-west-1(Oregon)', value: 'us-west-1' },
  { label: 'ap-south-1(Mumbai)', value: 'ap-south-1' },
  { label: 'ap-east-1(Hongkong)', value: 'ap-east-1' },
];

export const AWS_VPC_LIST = [
  {
    label: 'vpc-oaefc00ed733eb61e',
    description: '127.31.0.0/16 (default)',
    value: 'vpc-oaefc00ed733eb61e',
  },
  {
    label: 'vpc-oaefc00ed886eb61e',
    description: '127.36.0.0/16 (clickstream-vpc)',
    value: 'vpc-oaefc00ed886eb61e',
  },
  {
    label: 'vpc-oaefc00ed997eb61e',
    description: '10.10.0.0/16 (loghub-vpc)',
    value: 'vpc-oaefc00ed997eb61e',
  },
  {
    label: 'vpc-oaefc00e0987eb61e',
    description: '10.255.0.0/16 (other)',
    value: 'vpc-oaefc00e0987eb61e',
  },
];

export const DATA_COLLECTION_SDK_LIST: any = [
  {
    iconName: 'settings',
    label: 'Clickstream SDK (AWS Amplify)',
    value: 'clickstream',
  },
  {
    iconName: 'settings',
    label: 'Sensor Data SDK',
    value: 'sensor',
  },
  {
    iconName: 'settings',
    label: 'Thinking Data SDK',
    value: 'thinking',
  },
  {
    iconName: 'settings',
    label: 'Homegrown SDK',
    value: 'homegrown',
  },
];

export const PIPELINE_EXISTS_TEMPLATE_LIST = [
  {
    label: 'Amplify SDK',
    options: [
      {
        label:
          'Server-based ingestion + S3 data sink + default data model + Quicksight',
        value: '1',
      },
      {
        label:
          'Server-based ingestion + MSK data sink + default data model + Quicksight',
        value: '2',
      },
      {
        label:
          'Serverless ingestion + KDS data sink + default data model + Quicksight',
        value: '3',
      },
    ],
  },
  {
    label: 'Third-party SDK',
    options: [
      { label: 'Server-based ingestion + S3 data sink ', value: '4' },
      { label: 'Server-based ingestion + MSK data sink', value: '5' },
    ],
  },
];

export const ECS_CLUSTER_SIZE_LIST = [
  {
    value: 'X-Small',
    label: 'X-Small',
    description: 'c6g.medium(1vcp, 2G mem), 0~8,000 RPS',
  },
  {
    value: 'Small',
    label: 'Small',
    description: 'c6g.2xlarge(8vcp, 16G mem), 8,000 ~ 16,000 RPS',
  },
  {
    value: 'Medium',
    label: 'Medium',
    description: 'c6g.2xlarge(8vcp, 16G mem), 16,000 ~ 32,000 RPS',
  },
  {
    value: 'Large',
    label: 'Large',
    description: 'c6g.2xlarge(8vcp, 16G mem), 32,000 ~ 64,000 RPS',
  },
];

export const PLUGINS_LIST = [
  {
    name: 'IP lookup',
    description: 'This enrichment uses MaxMind databases to lookup use...',
    status: 'Enabled',
    edited: 'Nov 24, 2022',
  },
  {
    name: 'UA parser',
    description: 'This enrichment uses the ua-parser library to parse the ...',
    status: 'Enabled',
    edited: 'Nov 24, 2022',
  },
  {
    name: 'Event fingerprint',
    description: 'This enrichment generates a fingerprint for the event ...',
    status: 'Disabled',
    edited: 'Nov 24, 2022',
  },
];

export enum YES_NO {
  YES = 'Yes',
  NO = 'No',
}

export const YES_NO_LIST = [
  { value: YES_NO.YES, label: 'Yes' },
  { value: YES_NO.NO, label: 'No' },
];

export const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
