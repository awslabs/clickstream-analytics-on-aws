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

import { Link, Popover } from '@cloudscape-design/components';
import { debounce } from 'lodash';
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AnalyticsCustomHeaderProps {
  headerText: string;
  descriptionText?: string | null;
  children: ReactElement;
  updateContentHeader: (height: number) => void;
}

const debounceTime = 10;
const AnalyticsCustomHeader: React.FC<AnalyticsCustomHeaderProps> = (
  props: AnalyticsCustomHeaderProps
) => {
  const { headerText, descriptionText, updateContentHeader, children } = props;
  const { t } = useTranslation();
  const [divHeight, setDivHeight] = useState(0);
  const divRef = useRef<HTMLDivElement>(null);

  // Update height function
  const updateHeight = () => {
    if (divRef.current) {
      const newHeight = divRef.current.scrollHeight;
      setDivHeight(newHeight);
      updateContentHeader?.(newHeight);
    }
  };

  const debouncedUpdateHeight = debounce(updateHeight, debounceTime);

  useEffect(() => {
    window.addEventListener('resize', debouncedUpdateHeight);
    debouncedUpdateHeight();
    return () => {
      window.removeEventListener('resize', debouncedUpdateHeight);
      debouncedUpdateHeight.cancel();
    };
  }, [debounceTime]);

  useEffect(() => {
    debouncedUpdateHeight();
  }, [children]);

  return (
    <div
      className="analytics-custom-header"
      ref={divRef}
      style={{ marginTop: -(divHeight + 10) }}
    >
      <div className="analytics-custom-title">
        <span className="mr-5">{headerText}</span>
        <Popover
          triggerType="custom"
          content={t('analytics:information.exploreInfo')}
        >
          <Link variant="info">{t('info')}</Link>
        </Popover>
      </div>
      <div className="analytics-custom-description">{descriptionText}</div>
      {children}
    </div>
  );
};

export default AnalyticsCustomHeader;
