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

import {
  StatusIndicator,
  Spinner,
  Popover,
} from '@cloudscape-design/components';
import { fetchOutsideLink } from 'apis/resource';
import CopyText from 'components/common/CopyIcon';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface DomainNameWithStatusProps {
  pipelineId?: string;
  dns?: string;
  customDomain?: string;
  endpoint?: string;
  fetch?: boolean;
}

const DomainNameWithStatus: React.FC<DomainNameWithStatusProps> = (
  props: DomainNameWithStatusProps
) => {
  const { t } = useTranslation();
  const { pipelineId, dns, customDomain, endpoint, fetch } = props;
  const [domainResolved, setDomainResolved] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showText, setShowText] = useState('-');

  useEffect(() => {
    let requestUrl = '';
    if (dns) {
      requestUrl = `http://${dns}`;
      setShowText(dns);
    }
    if (endpoint) {
      requestUrl = endpoint;
      setShowText(endpoint);
    }
    if (customDomain) {
      requestUrl = `https://${customDomain}`;
      setShowText(customDomain);
    }
    if (fetch) {
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
      <CopyText text={showText === '-' ? '' : showText} />
      {showText}
      {fetch ? (
        <>
          {loadingData ? (
            <span className="ml-5">
              <Spinner />
            </span>
          ) : (
            pipelineId &&
            (domainResolved ? (
              <span className="ml-5">
                <StatusIndicator type="success" />
              </span>
            ) : (
              <Popover
                dismissButton={false}
                position="top"
                size="small"
                triggerType="custom"
                content={
                  <StatusIndicator type="error">
                    {t('common:status.dnsError')}
                  </StatusIndicator>
                }
              >
                <span className="ml-5">
                  <StatusIndicator type="error" />
                </span>
              </Popover>
            ))
          )}
        </>
      ) : null}
    </div>
  );
};

export default DomainNameWithStatus;
