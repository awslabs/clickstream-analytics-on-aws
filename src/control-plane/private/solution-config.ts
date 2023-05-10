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


export const SOLUTION_CONFIG_PATH = '/aws-exports.json';

export interface SolutionConfigProps {
  readonly issuer: string;
  readonly clientId: string;
  readonly redirectUrl: string;
  readonly solutionVersion: string;
  readonly cotrolPlaneMode: 'ALB' | 'CLOUDFRONT';
  readonly solutionBucket: string;
  readonly solutionPluginPrefix: string;
  readonly solutionRegion: string;
}

export function generateSolutionConfig(props: SolutionConfigProps ) {
  return {
    oidc_provider: props.issuer,
    oidc_client_id: props.clientId,
    oidc_redirect_url: props.redirectUrl + '/signin',
    solution_version: props.solutionVersion,
    cotrol_plane_mode: props.cotrolPlaneMode,
    solution_data_bucket: props.solutionBucket,
    solution_plugin_prefix: props.solutionPluginPrefix,
    solution_region: props.solutionRegion,
  };
}