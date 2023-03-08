import {
  SpaceBetween,
  Header,
  Container,
  FormField,
  Toggle,
  Select,
  Input,
} from '@cloudscape-design/components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const Reporting = () => {
  const { t } = useTranslation();
  const [createDashboard, setCreateDashboard] = useState(true);
  const [selectedQuicksightRole, setSelectedQuicksightRole] = useState<any>();

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
                placeholder={t('pipeline:create.quickSIghtPlaceholder') || ''}
                selectedOption={selectedQuicksightRole}
                onChange={({ detail }) =>
                  setSelectedQuicksightRole(detail.selectedOption)
                }
                options={[
                  {
                    label: 'my-quicksight-role-1',
                    value: '1',
                    iconName: 'settings',
                    description: 'ecommerce department',
                  },
                  {
                    label: 'my-quicksight-role-2',
                    value: '2',
                    iconName: 'settings',
                    description: 'gaming dept',
                  },
                ]}
                filteringType="auto"
                selectedAriaLabel="Selected"
              />
            </FormField>

            <FormField
              label={t('pipeline:create.datasetName')}
              description={t('pipeline:create.datasetNameDesc')}
            >
              <Input placeholder="my-dataset" value="" />
            </FormField>
          </>
        )}
      </SpaceBetween>
    </Container>
  );
};

export default Reporting;
