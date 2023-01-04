import {
  SpaceBetween,
  Header,
  Container,
  FormField,
  Toggle,
  RadioGroup,
  Tiles,
  Select,
  ColumnLayout,
  Input,
  Alert,
} from '@cloudscape-design/components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import UploadFile from './methods/UploadFile';
import { UsingUI } from './methods/UsingUI';

enum CreatioMethod {
  UPLOAD_FILE = 'UploadFile',
  USING_UI = 'UsingUI',
}

enum EngineType {
  Redshift = 'Redshift',
  Athena = 'Athena',
}

enum PartitionType {
  IngestionTime = 'IngestionTime',
  EventTime = 'EventTime',
}

const DataModeling: React.FC = () => {
  const { t } = useTranslation();
  const [enableDataModel, setenableDataModel] = useState(true);
  const [creationMethod, setCreationMethod] = useState<string>(
    CreatioMethod.UPLOAD_FILE
  );
  const [engineType, setEngineType] = useState<string>(EngineType.Redshift);
  const [selectedOption, setSelectedOption] = React.useState<any>();
  const [selectedQuicksight, setSelectedQuicksight] = React.useState<any>();
  const [unitOfTime, setUnitOfTime] = useState<any>({
    label: 'Months',
    value: 'months',
  });
  const [partitionType, setPartitionType] = useState<string>(
    PartitionType.IngestionTime
  );
  const [createDashboard, setCreateDashboard] = useState(true);
  return (
    <SpaceBetween direction="vertical" size="l">
      <Container
        header={
          <Header
            variant="h2"
            description={t('pipeline:create.enableModelingDesc')}
          >
            {t('pipeline:create.enableModeling')}
          </Header>
        }
      >
        <SpaceBetween direction="vertical" size="l">
          <FormField>
            <Toggle
              onChange={({ detail }) => setenableDataModel(detail.checked)}
              checked={enableDataModel}
            >
              <b>{t('pipeline:create.enableDataModel')}</b>
            </Toggle>
          </FormField>
          {enableDataModel && (
            <>
              <FormField
                label={t('pipeline:create.modelCreationMethod')}
                description={t('pipeline:create.modelCreationMethodDesc')}
              >
                <RadioGroup
                  onChange={({ detail }) => setCreationMethod(detail.value)}
                  value={creationMethod}
                  items={[
                    {
                      value: CreatioMethod.UPLOAD_FILE,
                      label: t('pipeline:create.uploadFile'),
                      description: t('pipeline:create.uploadFileDesc'),
                    },
                    {
                      value: CreatioMethod.USING_UI,
                      label: t('pipeline:create.usingUI'),
                      description: t('pipeline:create.usingUIDesc'),
                    },
                  ]}
                />
              </FormField>
              {creationMethod === CreatioMethod.UPLOAD_FILE && <UploadFile />}
              {creationMethod === CreatioMethod.USING_UI && <UsingUI />}
            </>
          )}
          <></>
        </SpaceBetween>
      </Container>

      <Container
        header={
          <Header
            variant="h2"
            description={t('pipeline:create.engineSettingDesc')}
          >
            {t('pipeline:create.engineSetting')}
          </Header>
        }
      >
        <SpaceBetween direction="vertical" size="l">
          <Tiles
            onChange={({ detail }) => setEngineType(detail.value)}
            value={engineType}
            columns={2}
            items={[
              {
                label: t('pipeline:create.engineRedshift'),
                value: EngineType.Redshift,
                description: t('pipeline:create.engineRedshiftDesc'),
              },
              {
                label: t('pipeline:create.engineAthena'),
                value: EngineType.Athena,
                description: t('pipeline:create.engineAthenaDesc'),
              },
            ]}
          />

          {engineType === EngineType.Redshift && (
            <FormField
              label={t('pipeline:create.engineRedshiftCluster')}
              description={t('pipeline:create.engineRedshiftClusterDesc')}
            >
              <Select
                placeholder={
                  t('pipeline:create.engineRedshiftClusterPlaceholder') || ''
                }
                selectedOption={selectedOption}
                onChange={({ detail }) =>
                  setSelectedOption(detail.selectedOption)
                }
                options={[
                  {
                    label: 'my-cluster-1',
                    value: '1',
                    iconName: 'settings',
                    description: 'ecommerce department',
                    labelTag: 'Provisioned',
                  },
                  {
                    label: 'mycluster-2',
                    value: '2',
                    iconName: 'settings',
                    description: 'gaming dept',
                    labelTag: 'Serverless',
                  },
                ]}
                filteringType="auto"
                selectedAriaLabel="Selected"
              />
            </FormField>
          )}

          <FormField
            label={t('pipeline:create.engineDataRange')}
            description={t('pipeline:create.engineDataRangeDesc')}
          >
            <ColumnLayout columns={2}>
              <div>
                <div>Duration</div>
                <Input
                  placeholder={
                    t('pipeline:create.engineDurationPlaceholder') || ''
                  }
                  controlId="input-1"
                  value=""
                />
              </div>
              <div>
                <div>{t('pipeline:create.engineUnitOfTime')}</div>
                <Select
                  selectedOption={unitOfTime}
                  onChange={({ detail }) =>
                    setUnitOfTime(detail.selectedOption)
                  }
                  options={[
                    { label: 'Years', value: 'years' },
                    { label: 'Months', value: 'months' },
                    { label: 'Days', value: 'days' },
                    { label: 'Hours', value: 'hours' },
                    { label: 'Minutes', value: 'minutes' },
                  ]}
                  selectedAriaLabel="Selected"
                />
              </div>
            </ColumnLayout>
          </FormField>

          <FormField
            label={t('pipeline:create.engineDataPartition')}
            description={t('pipeline:create.engineDataPartitionDesc')}
            stretch
          >
            <Alert>{t('pipeline:create.engineDataPartitionAlert')}</Alert>
            <div className="mt-10">
              <RadioGroup
                onChange={({ detail }) => setPartitionType(detail.value)}
                value={partitionType}
                items={[
                  {
                    value: PartitionType.IngestionTime,
                    label: t('pipeline:create.engineBaseIngestionTime'),
                    description: t(
                      'pipeline:create.engineBaseIngestionTimeDesc'
                    ),
                  },
                  {
                    value: PartitionType.EventTime,
                    label: t('pipeline:create.enginebaseEventTime'),
                    description: t('pipeline:create.enginebaseEventTimeDesc'),
                  },
                ]}
              />
            </div>
          </FormField>
        </SpaceBetween>
      </Container>

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
                  selectedOption={selectedQuicksight}
                  onChange={({ detail }) =>
                    setSelectedQuicksight(detail.selectedOption)
                  }
                  options={[
                    {
                      label: 'my-quicksight-1',
                      value: '1',
                      iconName: 'settings',
                      description: 'ecommerce department',
                    },
                    {
                      label: 'my-quicksight-2',
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
    </SpaceBetween>
  );
};

export default DataModeling;
