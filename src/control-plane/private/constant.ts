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

export class Constant {

  public static readonly NODE_IMAGE_V18 = 'public.ecr.aws/docker/library/node:18';

  public static readonly ERROR_CUSTOM_DOMAIN_REQUIRE_HTTPS = 'Please use the HTTPS protocol when using custom domain name';

  public static readonly ERROR_CERT_RECORD_ZONE_REQUIRED = 'IAM certificate,record name and hostZone are required for China regions';

  public static readonly ERROR_RECORD_ZONE_REQUIRED = 'Record name and hostZone are required';

  public static readonly NAG_REASON_TLSV1_REQUIRED_CN_REGION = 'TLSv1 is required in China regions';

  public static readonly NAG_REASON_TLSV1_2_DEFAULT_CERT_DOMAIN = 'suppress minium TLSv1.2 warning when using default certificate/domain name of cloudfront';

  public static readonly NAG_REASON_NO_VPC_INVOLVED = 'There is no vpc involved in current deployment mode, it is unnecessary to deploy to a vpc.';

  public static readonly NAG_REASON_COGNITO_MANAGED_FUN = 'Lambda Function is managed by Cognito to get service token.';


}