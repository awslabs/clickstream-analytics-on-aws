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

import { aws_sdk_client_common_config } from '@aws/clickstream-base-lib';
import {
  ACMClient,
  paginateListCertificates,
  CertificateStatus,
  CertificateSummary,
  KeyAlgorithm,
} from '@aws-sdk/client-acm';

import { Certificate } from '../../common/types';

export const ListCertificates = async (region: string) => {
  const certificates: Certificate[] = [];
  const acmClient = new ACMClient({
    ...aws_sdk_client_common_config,
    region,
  });
  const records: CertificateSummary[] = [];
  for await (const page of paginateListCertificates({ client: acmClient }, {
    CertificateStatuses: [CertificateStatus.ISSUED],
    Includes: {
      keyTypes: [
        KeyAlgorithm.EC_prime256v1,
        KeyAlgorithm.EC_secp384r1,
        KeyAlgorithm.EC_prime256v1,
        KeyAlgorithm.RSA_1024,
        KeyAlgorithm.RSA_2048,
        KeyAlgorithm.RSA_3072,
        KeyAlgorithm.RSA_4096,
      ],
    },
  })) {
    records.push(...page.CertificateSummaryList as CertificateSummary[]);
  }
  for (let cert of records) {
    if (cert.CertificateArn) {
      certificates.push({
        arn: cert.CertificateArn,
        domain: cert.DomainName ?? '',
        status: cert.Status ?? '',
      });
    }
  }
  return certificates;
};