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

import React from 'react';
import { useTranslation } from 'react-i18next';
import { MetadataSource } from 'ts/explore-types';
import { IAnalyticsItem } from '../AnalyticsType';

interface AttributePreviewProps {
  previewItem: IAnalyticsItem;
}

const AttributePreview: React.FC<AttributePreviewProps> = (
  props: AttributePreviewProps
) => {
  const { t } = useTranslation();
  const { previewItem } = props;
  return (
    <div className="csdc-event-preview">
      <div className="csdc-event-preview-container">
        <div className="csdc-event-preview-container-content">
          <div>
            {previewItem.metadataSource === MetadataSource.PRESET ? (
              <>
                <div className="event-type">
                  {t('analytics:labels.customAttribute')}
                </div>
                <div className="event-type system">
                  {t('analytics:labels.presetAttribute')}
                </div>
              </>
            ) : (
              <>
                <div className="event-type system">
                  {t('analytics:labels.customAttribute')}
                </div>
                <div className="event-type">
                  {t('analytics:labels.presetAttribute')}
                </div>
              </>
            )}
          </div>
          <div className="event-info">
            <div className="header-name">{previewItem?.label}</div>
            <div className="info-tem">
              <div className="info-key">
                {t('analytics:labels.previewName')}
              </div>
              <div className="info-value">{previewItem?.name}</div>
            </div>
            <div className="info-tem">
              <div className="info-key">
                {t('analytics:labels.previewDescription')}
              </div>
              <div className="info-value">{previewItem.description}</div>
            </div>
            <div className="info-tem">
              <div className="info-key">
                {t('analytics:labels.previewDataType')}
              </div>
              <div className="info-value">{previewItem.valueType}</div>
            </div>
            <div className="info-tem">
              <div className="info-key">
                {t('analytics:labels.previewUpdateTime')}
              </div>
              <div className="info-value">{previewItem.modifyTime}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttributePreview;
