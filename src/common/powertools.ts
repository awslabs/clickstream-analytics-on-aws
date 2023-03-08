/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/


export const POWERTOOLS_ENVS = {
  POWERTOOLS_SERVICE_NAME: 'ClickStreamAnalyticsOnAWS',
  POWERTOOLS_LOGGER_SAMPLE_RATE: '0.5',
  POWERTOOLS_LOGGER_LOG_EVENT: 'true',
  LOG_LEVEL: 'ERROR',
};

import {
  Logger,
} from '@aws-lambda-powertools/logger';

const logger = new Logger();

export {
  logger,
};