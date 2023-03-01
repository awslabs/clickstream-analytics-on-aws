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

export enum SinkType {
  S3 = 's3',
  MSK = 'msk',
  KDS = 'kds',
}

export enum ProtocalType {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
}
