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
import { Box, SpaceBetween } from '@cloudscape-design/components';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';
import ExtendIcon from 'components/common/ExtendIcon';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ExploreEmbedFrameProps {
  embedType: 'dashboard' | 'visual' | 'console';
  embedUrl: string;
  embedPage: 'dashboard' | 'explore' | 'analyze';
}

const ExploreEmbedFrame: React.FC<ExploreEmbedFrameProps> = (
  props: ExploreEmbedFrameProps
) => {
  const { embedType, embedUrl, embedPage } = props;
  const { t, i18n } = useTranslation();

  const embedContainer = async () => {
    if (embedUrl === '') {
      return;
    }
    const embeddingContext = await createEmbeddingContext();
    switch (embedType) {
      case 'dashboard':
        await embeddingContext.embedDashboard(
          {
            url: embedUrl,
            container: `#EmbedId`,
            resizeHeightOnSizeChangedEvent: true,
          },
          {
            locale: i18n.language,
          }
        );
        break;
      case 'visual':
        await embeddingContext.embedVisual(
          {
            url: embedUrl,
            container: `#EmbedId`,
            resizeHeightOnSizeChangedEvent: true,
          },
          {
            locale: i18n.language,
          }
        );
        break;
      case 'console':
        await embeddingContext.embedConsole(
          {
            url: embedUrl,
            container: `#EmbedId`,
            resizeHeightOnSizeChangedEvent: true,
          },
          {
            locale: i18n.language,
          }
        );
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (embedUrl) {
      embedContainer();
    }
  }, [embedUrl]);

  return (
    <div
      id="EmbedId"
      className={
        embedType === 'console'
          ? 'iframe-explore fixed-height'
          : 'iframe-explore'
      }
    >
      {embedUrl === '' && (
        <div>
          <Box
            margin={{ vertical: 'xs' }}
            textAlign="center"
            color="text-status-inactive"
          >
            <ExtendIcon icon="ClipboardData" color="#666" />
            {embedPage === 'explore' && (
              <SpaceBetween size="m">
                {t('analytics:emptyDataMessage')}
              </SpaceBetween>
            )}
            {embedPage === 'dashboard' && (
              <SpaceBetween size="m">
                {t('analytics:emptyDashboardMessage')}
              </SpaceBetween>
            )}
            {embedPage === 'analyze' && (
              <SpaceBetween size="m">
                {t('analytics:emptyAnalyzeMessage')}
              </SpaceBetween>
            )}
          </Box>
        </div>
      )}
    </div>
  );
};

export default ExploreEmbedFrame;
