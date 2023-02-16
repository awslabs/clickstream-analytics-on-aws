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

export const SUBNETS_PATTERN = 'subnet-[a-f0-9]+,(subnet-[a-f0-9]+,?)+';
export const DOMAIN_NAME_PATTERN = '[a-z0-9A-Z#$&@_%~\\*\\.\\-]+\\.[a-zA-Z0-9]{2,6}';
export const IP_PATTERN = '((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})(\\.((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})){3}';
export const HOST_ZONE_ID_PATTERN = '^Z[A-Z0-9]+$';
export const RECORD_NAME_PARRERN = '^[a-zA-Z0-9\\-_]{1,63}$';
export const VPC_ID_PARRERN = '^vpc-[a-f0-9]+$';

export const PARAMETER_GROUP_LABEL_VPC = 'VPC Information';
export const PARAMETER_GROUP_LABEL_DOMAIN = 'Domain Information';
export const PARAMETER_LABEL_VPCID = 'VPC ID';
export const PARAMETER_LABEL_PUBLIC_SUBNETS = 'Public Subnet IDs';
export const PARAMETER_LABEL_PRIVATE_SUBNETS = 'Private Subnet IDs';
export const PARAMETER_LABEL_HOST_ZONE_ID = 'Host Zone ID';
export const PARAMETER_LABEL_HOST_ZONE_NAME = 'Host Zone Name';
export const PARAMETER_LABEL_RECORD_NAME = 'Record Name';
export const KAFKA_BROKERS_PATTERN = `(((${DOMAIN_NAME_PATTERN}|${IP_PATTERN})(:[0-9]+){0,1},?)){1,3}`;
export const KAFKA_TOPIC_PATTERN = '[a-zA-Z0-9_\\-\\.]+';
