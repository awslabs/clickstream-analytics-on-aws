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
  Container,
  Header,
  Link,
  SpaceBetween,
  Toggle,
  Table,
  Box,
  TextFilter,
  Button,
  Pagination,
  StatusIndicator,
  FormField,
  Tiles,
  Select,
  ColumnLayout,
  Input,
} from '@cloudscape-design/components';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PLUGINS_LIST, TRANSFORM_LIST } from 'ts/const';

enum EngineType {
  Redshift = 'Redshift',
  Athena = 'Athena',
}

const ConfigETL = () => {
  const { t } = useTranslation();
  const [enableETL, setEnableETL] = useState(true);
  const [selectedItems, setSelectedItems] = React.useState<any>([
    { name: 'Item 2' },
  ]);
  const [engineType, setEngineType] = useState<string>(EngineType.Redshift);
  const [selectedOption, setSelectedOption] = React.useState<any>();
  const [unitOfTime, setUnitOfTime] = useState<any>({
    label: 'Months',
    value: 'months',
  });

  return (
    <SpaceBetween direction="vertical" size="l">
      <Container
        header={
          <Header
            variant="h2"
            description={
              <div>
                {t('pipeline:create.enableETLDesc1')} (
                <Link external>{t('learnMore')}</Link>){' '}
                {t('pipeline:create.enableETLDesc2')}
              </div>
            }
          >
            {t('pipeline:create.enableETL')}
          </Header>
        }
      >
        <Toggle
          onChange={({ detail }) => setEnableETL(detail.checked)}
          checked={enableETL}
        >
          <b> {t('pipeline:create.enableETL')}</b>
        </Toggle>
      </Container>

      {enableETL && (
        <>
          <Table
            onSelectionChange={({ detail }) =>
              setSelectedItems(detail.selectedItems)
            }
            selectedItems={selectedItems}
            ariaLabels={{
              selectionGroupLabel: t('pipeline:create.itemSelection') || '',
              allItemsSelectionLabel: ({ selectedItems }) =>
                `${selectedItems.length} ${
                  selectedItems.length === 1 ? t('item') : t('items')
                } ${t('selected')}`,
              itemSelectionLabel: ({ selectedItems }, item) => {
                const isItemSelected = selectedItems.filter(
                  (i) => i.name === item.name
                ).length;
                return `${item.name} is ${isItemSelected ? '' : t('not')} ${t(
                  'selected'
                )}`;
              },
            }}
            columnDefinitions={[
              {
                id: 'name',
                header: t('pipeline:create.name'),
                cell: (e) => e.name,
              },
              {
                id: 'desc',
                header: t('pipeline:create.desc'),
                cell: (e) => e.description,
              },
              {
                id: 'status',
                header: t('status'),
                cell: (e) => {
                  return (
                    <StatusIndicator
                      type={e.status === 'Enabled' ? 'success' : 'stopped'}
                    >
                      {e.status}
                    </StatusIndicator>
                  );
                },
              },
              {
                id: 'edited',
                header: t('pipeline:create.lastEdit'),
                cell: (e) => e.edited,
                sortingField: 'edited',
              },
            ]}
            items={TRANSFORM_LIST}
            loadingText={t('pipeline:create.loading') || ''}
            selectionType="single"
            trackBy="name"
            empty={
              <Box textAlign="center" color="inherit">
                <b>{t('pipeline:create.noPlugin')}</b>
                <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                  {t('pipeline:create.noPluginDisplay')}
                </Box>
                <Button>{t('button.createResource')}</Button>
              </Box>
            }
            filter={
              <TextFilter
                filteringPlaceholder={t('pipeline:create.findPlugin') || ''}
                filteringText=""
              />
            }
            header={
              <Header
                description={
                  <div>
                    {t('pipeline:create.transformDesc1')}(
                    <Link external>{t('learnMore')}</Link>){' '}
                    {t('pipeline:create.transformDesc2')}
                  </div>
                }
              >
                {t('pipeline:create.transform')}
              </Header>
            }
            pagination={
              <Pagination
                currentPageIndex={1}
                pagesCount={2}
                ariaLabels={{
                  nextPageLabel: t('nextPage') || '',
                  previousPageLabel: t('prePage') || '',
                  pageLabel: (pageNumber) =>
                    `${t('page')} ${pageNumber} ${t('allPages')}`,
                }}
              />
            }
          />

          <Table
            onSelectionChange={({ detail }) =>
              setSelectedItems(detail.selectedItems)
            }
            selectedItems={selectedItems}
            ariaLabels={{
              selectionGroupLabel: t('pipeline:create.itemSelection') || '',
              allItemsSelectionLabel: ({ selectedItems }) =>
                `${selectedItems.length} ${
                  selectedItems.length === 1 ? t('item') : t('items')
                } ${t('selected')}`,
              itemSelectionLabel: ({ selectedItems }, item) => {
                const isItemSelected = selectedItems.filter(
                  (i) => i.name === item.name
                ).length;
                return `${item.name} is ${isItemSelected ? '' : t('not')} ${t(
                  'selected'
                )}`;
              },
            }}
            columnDefinitions={[
              {
                id: 'name',
                header: t('pipeline:create.name'),
                cell: (e) => e.name,
              },
              {
                id: 'desc',
                header: t('pipeline:create.desc'),
                cell: (e) => e.description,
              },
              {
                id: 'status',
                header: t('status'),
                cell: (e) => {
                  return (
                    <StatusIndicator
                      type={e.status === 'Enabled' ? 'success' : 'stopped'}
                    >
                      {e.status}
                    </StatusIndicator>
                  );
                },
              },
              {
                id: 'edited',
                header: t('pipeline:create.lastEdit'),
                cell: (e) => e.edited,
                sortingField: 'edited',
              },
            ]}
            items={PLUGINS_LIST}
            loadingText={t('pipeline:create.loading') || ''}
            selectionType="multi"
            trackBy="name"
            empty={
              <Box textAlign="center" color="inherit">
                <b>{t('pipeline:create.noPlugin')}</b>
                <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                  {t('pipeline:create.noPluginDisplay')}
                </Box>
                <Button>{t('button.createResource')}</Button>
              </Box>
            }
            filter={
              <TextFilter
                filteringPlaceholder={t('pipeline:create.findPlugin') || ''}
                filteringText=""
              />
            }
            header={
              <Header
                counter={
                  selectedItems.length
                    ? '(' + selectedItems.length + '/10)'
                    : '(10)'
                }
                description={t('pipeline:create.selectEnrich')}
              >
                {t('pipeline:create.enrichPlugins')}
              </Header>
            }
            pagination={
              <Pagination
                currentPageIndex={1}
                pagesCount={2}
                ariaLabels={{
                  nextPageLabel: t('nextPage') || '',
                  previousPageLabel: t('prePage') || '',
                  pageLabel: (pageNumber) =>
                    `${t('page')} ${pageNumber} ${t('allPages')}`,
                }}
              />
            }
          />

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
                <>
                  <FormField
                    label={t('pipeline:create.engineRedshiftCluster')}
                    description={t('pipeline:create.engineRedshiftClusterDesc')}
                  >
                    <Select
                      placeholder={
                        t('pipeline:create.engineRedshiftClusterPlaceholder') ||
                        ''
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
                  <FormField
                    label={t('pipeline:create.engineDataRange')}
                    description={t('pipeline:create.engineDataRangeDesc')}
                  >
                    <ColumnLayout columns={2}>
                      <div>
                        <div>
                          <b>{t('pipeline:create.duration')}</b>
                        </div>
                        <Input
                          placeholder={
                            t('pipeline:create.engineDurationPlaceholder') || ''
                          }
                          controlId="input-1"
                          value=""
                        />
                      </div>
                      <div>
                        <div>
                          <b>{t('pipeline:create.engineUnitOfTime')}</b>
                        </div>
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
                </>
              )}

              {engineType === EngineType.Athena && (
                <>
                  <FormField
                    label={t('pipeline:create.workgroup')}
                    description={t('pipeline:create.workgroupDesc')}
                  >
                    <Select
                      placeholder={t('pipeline:create.findWorkGroup') || ''}
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
                </>
              )}
            </SpaceBetween>
          </Container>
        </>
      )}
    </SpaceBetween>
  );
};

export default ConfigETL;
