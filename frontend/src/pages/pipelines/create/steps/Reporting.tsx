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
  SpaceBetween,
  Header,
  Container,
  FormField,
  Toggle,
  Select,
  Input,
  SelectProps,
} from '@cloudscape-design/components';
import { getServiceRoles } from 'apis/resource';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ReportingProps {
  pipelineInfo: IExtPipeline;
  changeQuickSightSelectedRole: (role: SelectProps.Option) => void;
  changeDatasetName: (name: string) => void;
}

const Reporting: React.FC<ReportingProps> = (props: ReportingProps) => {
  const { t } = useTranslation();
  const { pipelineInfo, changeQuickSightSelectedRole, changeDatasetName } =
    props;
  const [createDashboard, setCreateDashboard] = useState(true);
  const [quickSightRoleOptions, setQuickSightRoleOptions] =
    useState<SelectProps.Options>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // get msk clusters by region
  const getQuickSightRoles = async () => {
    setLoadingRoles(true);
    try {
      const { success, data }: ApiResponse<QuickSightResponse[]> =
        await getServiceRoles({ service: 'quicksight' });
      if (success) {
        const mskOptions: SelectProps.Options = data.map((element) => ({
          label: element.name,
          value: element.arn,
          iconName: 'settings',
          description: element.id,
        }));
        setQuickSightRoleOptions(mskOptions);
        setLoadingRoles(false);
      }
    } catch (error) {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    getQuickSightRoles();
  }, []);

  return (
    <Container
      header={
        <Header
          variant="h2"
          description={t('pipeline:create.reportSettingsDesc')}
        >
          {t('pipeline:create.reportSettings')}
        </Header>
      }
    >
      <SpaceBetween direction="vertical" size="l">
        <FormField>
          <Toggle
            onChange={({ detail }) => setCreateDashboard(detail.checked)}
            checked={createDashboard}
          >
            <b>{t('pipeline:create.createSampleQuickSight')}</b>
          </Toggle>
        </FormField>

        {createDashboard && (
          <>
            <FormField
              label={t('pipeline:create.quickSightAccount')}
              description={t('pipeline:create.quickSightAccountDesc')}
            >
              <Select
                statusType={loadingRoles ? 'loading' : 'finished'}
                placeholder={t('pipeline:create.quickSIghtPlaceholder') || ''}
                selectedOption={pipelineInfo.selectedQuickSightRole}
                onChange={({ detail }) =>
                  changeQuickSightSelectedRole(detail.selectedOption)
                }
                options={quickSightRoleOptions}
                filteringType="auto"
              />
            </FormField>

            <FormField
              label={t('pipeline:create.datasetName')}
              description={t('pipeline:create.datasetNameDesc')}
            >
              <Input
                placeholder="my-dataset"
                value={pipelineInfo.quickSightDataset}
                onChange={(e) => {
                  changeDatasetName(e.detail.value);
                }}
              />
            </FormField>
          </>
        )}
      </SpaceBetween>
    </Container>
  );
};

export default Reporting;
