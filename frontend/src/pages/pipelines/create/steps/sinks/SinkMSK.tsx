import {
  Container,
  FormField,
  Input,
  Select,
  SpaceBetween,
  Tabs,
} from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const SinkMSK: React.FC = () => {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = React.useState<any>({
    label: 'my-msk-cluster',
    value: '1',
    iconName: 'settings',
    description: 'The dedicated msk cluster for ecommerce apps',
    tags: ['Apache Kafka version: 2.8/1', '3 broker nodes/100GB'],
    labelTag: 'Provisioned',
  });
  return (
    <SpaceBetween direction="vertical" size="l">
      <FormField
        label={t('pipeline:create.msk.mskCluster')}
        description={t('pipeline:create.msk.mskClusterDesc')}
      />

      <Container disableContentPaddings>
        <Tabs
          tabs={[
            {
              label: t('pipeline:create.msk.select'),
              id: 'select',
              content: (
                <SpaceBetween direction="vertical" size="l">
                  <div className="plr-20">
                    <FormField>
                      <Select
                        selectedOption={selectedOption}
                        onChange={({ detail }) =>
                          setSelectedOption(detail.selectedOption)
                        }
                        options={[
                          {
                            label: 'my-msk-cluster',
                            value: '1',
                            iconName: 'settings',
                            description:
                              'The dedicated msk cluster for ecommerce apps',
                            tags: [
                              'Apache Kafka version: 2.8/1',
                              '3 broker nodes/100GB',
                            ],
                            labelTag: 'Provisioned',
                          },
                          {
                            label: 'my-second-msk-cluster',
                            value: '2',
                            iconName: 'settings',
                            description:
                              'A shared MSK cluster for every team in the company',
                            tags: ['vpc-0e8d0355652c77758', 'Feature 2'],
                            labelTag: 'Serverless',
                          },
                        ]}
                        filteringType="auto"
                        selectedAriaLabel="Selected"
                      />
                    </FormField>
                  </div>

                  <div className="plr-20">
                    <FormField
                      label={t('pipeline:create.msk.topic')}
                      description={t('pipeline:create.msk.topicDesc')}
                    >
                      <Input
                        placeholder={
                          t('pipeline:create.msk.enterTopicName') || ''
                        }
                        value=""
                      />
                    </FormField>
                  </div>
                </SpaceBetween>
              ),
            },
            {
              label: t('pipeline:create.msk.manual'),
              id: 'manual',
              content: (
                <SpaceBetween direction="vertical" size="l">
                  <div className="plr-20">
                    {t('pipeline:create.msk.toBeDesign')}
                  </div>
                </SpaceBetween>
              ),
            },
          ]}
        />
      </Container>
    </SpaceBetween>
  );
};

export default SinkMSK;
