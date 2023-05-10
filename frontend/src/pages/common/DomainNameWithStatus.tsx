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

import { StatusIndicator, Spinner } from '@cloudscape-design/components';
import { fetchOutsideLink } from 'apis/resource';
import CopyText from 'components/common/CopyIcon';
import React, { useState, useEffect } from 'react';

interface DomainNameWithStatusProps {
  pipelineId?: string;
  dns?: string;
  customDomain?: string;
}

const DomainNameWithStatus: React.FC<DomainNameWithStatusProps> = (
  props: DomainNameWithStatusProps
) => {
  const { pipelineId, dns, customDomain } = props;
  const [domainResolved, setDomainResolved] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (dns) {
      let requestUrl = `http://${dns}`;
      if (customDomain) {
        requestUrl = `https://${customDomain}`;
      }
      setLoadingData(true);
      fetchOutsideLink({ method: 'get', url: `${requestUrl}` })
        .then((response: ApiResponse<FetchOutsideResponse>) => {
          setLoadingData(false);
          if (response.data.ok) {
            setDomainResolved(true);
          } else {
            setDomainResolved(false);
          }
        })
        .catch((error) => {
          setLoadingData(false);
          setDomainResolved(false);
        });
    }
  }, [dns]);

  return (
    <div>
      {(dns || customDomain) && <CopyText text={dns || customDomain || ''} />}
      {dns || customDomain || '-'}
      {loadingData ? (
        <span className="ml-5">
          <Spinner />
        </span>
      ) : (
        pipelineId &&
        dns &&
        (domainResolved ? (
          <span className="ml-5">
            <StatusIndicator type="success" />
          </span>
        ) : (
          <span className="ml-5">
            <StatusIndicator type="error" />
          </span>
        ))
      )}
    </div>
  );
};

export default DomainNameWithStatus;
