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
import { Box } from '@cloudscape-design/components';
import { createEmbeddingContext } from 'amazon-quicksight-embedding-sdk';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ExploreEmbedFrameProps {
  embedType: 'dashboard' | 'visual';
  embedUrl: string;
  embedId: string;
}

const ExploreEmbedFrame: React.FC<ExploreEmbedFrameProps> = (
  props: ExploreEmbedFrameProps
) => {
  const { t } = useTranslation();
  const { embedType, embedUrl, embedId } = props;

  const embedContainer = async () => {
    const embeddingContext = await createEmbeddingContext();
    switch (embedType) {
      case 'dashboard':
        await embeddingContext.embedDashboard({
          url: embedUrl,
          container: `#${embedId}`,
          resizeHeightOnSizeChangedEvent: true,
        });
        break;
      case 'visual':
        await embeddingContext.embedVisual({
          url: embedUrl,
          container: `#${embedId}`,
          resizeHeightOnSizeChangedEvent: true,
        });
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (embedUrl && embedId) {
      embedContainer();
    }
  }, [embedUrl, embedId]);

  return (
    <>
      {embedUrl ? (
        <div id={embedId} className="iframe-explore"></div>
      ) : (
        <>
          <Box textAlign="center" color="inherit">
            <b>{t('analytics:emptyData')}</b>
            <Box variant="p" color="inherit">
              {t('analytics:emptyDataMessage')}
            </Box>
          </Box>
        </>
      )}
    </>
  );
};

export default ExploreEmbedFrame;
