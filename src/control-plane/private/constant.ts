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

export class Constant {

  public static readonly NODE_IMAGE_V16_SLIM = 'public.ecr.aws/docker/library/node:16-slim';

  public static readonly ERROR_CUSTOM_DOMAIN_REQUIRE_HTTPS = 'Please use the HTTPS protocol when using custom domain name';

  public static readonly ERROR_CERT_RECORD_ZONE_REQUIRED = 'IAM certificate,record name and hostZone are required for China regions';

  public static readonly ERROR_RECORD_ZONE_REQUIRED = 'Record name and hostZone are required';

  public static readonly NAG_REASON_CERT_VALIDATION_MANAGED_FUN = 'Lambda Function is managed by CDK for certificate validation';

  public static readonly NAG_REASON_CDK_BUCKETDEPLOYMENT_MANAGED_FUN = 'Lambda Function is managed by CDK BucketDeployment';

  public static readonly NAG_REASON_WILDCARD_REQUIRED_CERT_REQUEST_FUN = 'wildcard resource is used for certificate request Lambda Function';

  public static readonly NAG_REASON_TLSV_REQUIRED_CN_REGION = 'TLSv1 is required in China regisons';

  public static readonly NAG_REASON_TLSV1_2_DEFAULT_CERT_DOMAIN = 'suppress minium TLSv1.2 warning when using default certificate/domain name of cloudfront';

  public static readonly NAG_REASON_CDK_S3_BUCKET_MANAGED_FUN = 'Lambda Function is managed by CDK S3 Bucket';

}