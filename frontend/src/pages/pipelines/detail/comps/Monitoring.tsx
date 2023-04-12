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
  Box,
  Button,
  Container,
  ExpandableSection,
  FormField,
  Grid,
  Input,
  SpaceBetween,
  TextContent,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface TabContentProps {
  pipelineInfo?: IPipeline;
}
const Monitoring: React.FC<TabContentProps> = () => {
  const { t } = useTranslation();
  return (
    <SpaceBetween direction="vertical" size="l">
      <Container>
        <ExpandableSection
          defaultExpanded
          headerText={t('pipeline:detail.accessFromConsole')}
        >
          <SpaceBetween direction="vertical" size="s">
            <div className="mt-10">
              <Button
                href="/"
                iconAlign="right"
                iconName="external"
                target="_blank"
              >
                {t('button.viewInCloudWatch')}
              </Button>
            </div>
            <Box variant="p">{t('pipeline:detail.accessFromConsoleDesc')}</Box>
          </SpaceBetween>
        </ExpandableSection>
      </Container>

      <Container>
        <ExpandableSection
          defaultExpanded
          headerText={t('pipeline:detail.accessFromSolution')}
        >
          <SpaceBetween direction="vertical" size="s">
            <div className="mt-10">
              <Box variant="p">
                {t('pipeline:detail.accessFromSolutionDesc')}
              </Box>
            </div>
            <div className="mt-10">
              <TextContent>
                <ol>
                  <li>{t('pipeline:detail.accessFromSolutionStep1')}</li>
                  <li>{t('pipeline:detail.accessFromSolutionStep2')}</li>
                  <li>{t('pipeline:detail.accessFromSolutionStep3')}</li>
                  <li>{t('pipeline:detail.accessFromSolutionStep4')}</li>
                  <li>{t('pipeline:detail.accessFromSolutionStep5')}</li>
                  <li>{t('pipeline:detail.accessFromSolutionStep6')}</li>
                </ol>
              </TextContent>
            </div>
          </SpaceBetween>
        </ExpandableSection>

        <FormField label={t('pipeline:detail.sharingUrl')} stretch>
          <Grid gridDefinition={[{ colspan: 8 }, { colspan: 4 }]}>
            <div>
              <Input
                placeholder="https://cloudwatch.aws.com/prefix/object"
                value=""
              />
            </div>
            <div>
              <Button iconName="add-plus">
                {t('button.integrateDashboard')}
              </Button>
            </div>
          </Grid>
        </FormField>
      </Container>
    </SpaceBetween>
  );
};

export default Monitoring;
