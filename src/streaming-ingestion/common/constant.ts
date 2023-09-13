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

export const S3_BUCKET_ARN_PATTERN = 'arn:aws:s3:::[a-z0-9\\.\\-]{3,63}';

export const KINESIS_KEY_ID = 'alias/aws/kinesis';
export const PROPERTY_GROUP_ID = 'FlinkApplicationProperties';
export const APPLICATION_CODE_FILE_PREFIX = 'flinketl';
export const GEO_FILE_NAME = 'GeoLite2-City.mmdb';

export const STREAM_NAME_PREFIX = 'clickstream_';
