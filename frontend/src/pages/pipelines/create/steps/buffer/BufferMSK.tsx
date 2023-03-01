import {
  Container,
  FormField,
  Input,
  RadioGroup,
  Select,
  SpaceBetween,
  Tabs,
} from '@cloudscape-design/components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

enum BufferMSKType {
  CREATE = 'create',
  EXSITING = 'exsiting',
}

const BufferMSK: React.FC = () => {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<any>();
  const [mskType, setMSKType] = useState<string>(BufferMSKType.EXSITING);
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
                <div className="plr-20">
                  <SpaceBetween direction="vertical" size="l">
                    <RadioGroup
                      onChange={({ detail }) => setMSKType(detail.value)}
                      value={mskType}
                      items={[]}
                    />

                    {mskType === BufferMSKType.EXSITING && (
                      <SpaceBetween direction="vertical" size="l">
                        <FormField>
                          <Select
                            selectedOption={selectedOption}
                            onChange={({ detail }) =>
                              setSelectedOption(detail.selectedOption)
                            }
                            options={[]}
                            filteringType="auto"
                            selectedAriaLabel="Selected"
                          />
                        </FormField>
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
                      </SpaceBetween>
                    )}
                  </SpaceBetween>
                </div>
              ),
            },
            {
              label: t('pipeline:create.msk.manual'),
              id: 'manual',
              content: (
                <SpaceBetween direction="vertical" size="l">
                  <div className="plr-20">
                    <SpaceBetween direction="vertical" size="l">
                      <FormField
                        label={t('pipeline:create.msk.brokerLink')}
                        description={t('pipeline:create.msk.brokerLinkDesc')}
                      >
                        <Input
                          placeholder={
                            t('pipeline:create.msk.brokerLindPlaceHolder') || ''
                          }
                          value=""
                        />
                      </FormField>
                      <FormField
                        label={t('pipeline:create.msk.topic')}
                        description={t('pipeline:create.msk.manualTopicDesc')}
                      >
                        <Input
                          placeholder={
                            t('pipeline:create.msk.enterTopicName') || ''
                          }
                          value=""
                        />
                      </FormField>
                    </SpaceBetween>
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

export default BufferMSK;
