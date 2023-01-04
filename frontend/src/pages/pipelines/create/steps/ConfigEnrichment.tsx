import {
  Container,
  Header,
  SpaceBetween,
  Table,
  Box,
  TextFilter,
  Button,
  Pagination,
  StatusIndicator,
  Tabs,
} from '@cloudscape-design/components';
import CodePage from 'pages/common/CodePage';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PLUGINS_LIST } from 'ts/const';

const ConfigEnrichment: React.FC = () => {
  const { t } = useTranslation();
  const [selectedItems, setSelectedItems] = React.useState<any>([
    { name: 'Item 2' },
  ]);
  return (
    <SpaceBetween direction="vertical" size="l">
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
            id: 'settings',
            header: '',
            cell: (e) => {
              return <Button variant="icon" iconName="settings" />;
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
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="add-plus">{t('button.addNew')}</Button>
                <Button>{t('button.disable')}</Button>
                <Button variant="primary">{t('button.enable')}</Button>
              </SpaceBetween>
            }
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

      <Container disableContentPaddings>
        <Tabs
          tabs={[
            {
              label: t('pipeline:create.code'),
              id: 'code',
              content: (
                <div className="pd-20">
                  <SpaceBetween direction="vertical" size="l">
                    <div>
                      <CodePage />
                    </div>
                    <div className="text-right">
                      <Button variant="link">{t('button.cancel')}</Button>
                      <Button variant="link">{t('button.validate')}</Button>
                      <Button>{t('button.submit')}</Button>
                    </div>
                  </SpaceBetween>
                </div>
              ),
            },
            {
              label: 'Configuration',
              id: 'config',
              content: (
                <div className="pd-20">
                  <SpaceBetween direction="vertical" size="l">
                    <div>
                      <CodePage />
                    </div>
                    <div className="text-right">
                      <Button variant="link">{t('button.cancel')}</Button>
                      <Button variant="link">{t('button.validate')}</Button>
                      <Button>{t('button.submit')}</Button>
                    </div>
                  </SpaceBetween>
                </div>
              ),
            },
          ]}
        />
      </Container>
    </SpaceBetween>
  );
};

export default ConfigEnrichment;
