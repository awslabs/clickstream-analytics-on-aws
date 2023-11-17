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
import i18n from 'i18n';
import { t } from 'i18next';
import React, { useEffect } from 'react';

interface ExploreEmbedFrameProps {
  embedType: 'dashboard' | 'visual' | 'console';
  embedUrl: string;
}

const ExploreEmbedFrame: React.FC<ExploreEmbedFrameProps> = (
  props: ExploreEmbedFrameProps
) => {
  const { embedType, embedUrl } = props;

  const embedContainer = async () => {
    if (embedUrl === '') {
      return;
    }
    const embeddingContext = await createEmbeddingContext();
    switch (embedType) {
      case 'dashboard':
        await embeddingContext.embedDashboard({
          url: embedUrl,
          container: `#EmbedId`,
          resizeHeightOnSizeChangedEvent: true,
          height: '100%',
          width: '100%',
        });
        break;
      case 'visual':
        await embeddingContext.embedVisual({
          url: embedUrl,
          container: `#EmbedId`,
          resizeHeightOnSizeChangedEvent: true,
          height: '100%',
          width: '100%',
        });
        break;
      case 'console':
        await embeddingContext.embedConsole(
          {
            url: embedUrl,
            container: `#EmbedId`,
            resizeHeightOnSizeChangedEvent: true,
            height: '1000',
            width: '100%',
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
    <div id={'EmbedId'} className="iframe-explore">
      {embedUrl === '' && (
        <div>
          <Box margin={{ vertical: 'xs' }} textAlign="center" color="inherit">
            <ExtendIcon icon="ClipboardData" color="#666" />
            <SpaceBetween size="m">
              <b>{t('analytics:emptyDataMessage')}</b>
            </SpaceBetween>
          </Box>
        </div>
      )}
    </div>
  );
};

export default ExploreEmbedFrame;
