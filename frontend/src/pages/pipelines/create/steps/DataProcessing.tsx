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
  FormField,
  Select,
  Input,
  Checkbox,
  AutosuggestProps,
  SelectProps,
} from '@cloudscape-design/components';
import {
  getRedshiftServerlessWorkgroup,
  getServiceRolesByAccount,
} from 'apis/resource';

import Divider from 'components/common/Divider';
import PluginTable from 'pages/plugins/comps/PluginTable';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_TRANSFORM_SDK_IDS,
  EVENT_REFRESH_UNIT_LIST,
  EXCUTION_UNIT_LIST,
  EXECUTION_TYPE_LIST,
  ExecutionType,
} from 'ts/const';

interface DataProcessingProps {
  pipelineInfo: IExtPipeline;
  changeEnableDataProcessing: (enable: boolean) => void;
  changeExecutionType: (type: SelectProps.Option) => void;
  changeExecutionFixedValue: (value: string) => void;
  changeExecutionFixedUnit: (unit: SelectProps.Option) => void;
  changeEventFreshValue: (value: string) => void;
  changeEventFreshUnit: (unit: SelectProps.Option) => void;
  changeExecutionCronExp: (cron: string) => void;
  changeEnableRedshift: (enable: boolean) => void;
  changeSelectedRedshift: (cluster: SelectProps.Option) => void;
  changeSelectedRedshiftRole: (role: SelectProps.Option) => void;
  changeRedshiftExecutionDuration: (duration: string) => void;
  changeRedshiftExecutionUnit: (unit: SelectProps.Option) => void;
  changeEnableAthena: (enable: boolean) => void;

  changeTransformPlugins: (plugins: IPlugin[]) => void;
  changeEnrichPlugins: (plugins: IPlugin[]) => void;
}

const DataProcessing: React.FC<DataProcessingProps> = (
  props: DataProcessingProps
) => {
  const { t } = useTranslation();
  const {
    pipelineInfo,
    changeEnableDataProcessing,
    changeExecutionType,
    changeExecutionFixedValue,
    changeExecutionFixedUnit,
    changeEventFreshValue,
    changeEventFreshUnit,
    changeExecutionCronExp,
    changeEnableRedshift,
    changeSelectedRedshift,
    changeSelectedRedshiftRole,
    changeRedshiftExecutionDuration,
    changeRedshiftExecutionUnit,
    changeEnableAthena,
    changeTransformPlugins,
    changeEnrichPlugins,
  } = props;

  const [selectedExecution, setSelectedExecution] = useState(
    pipelineInfo.selectedExcutionType || EXECUTION_TYPE_LIST[0]
  );
  const [selectedExecutionUnit, setSelectedExecutionUnit] = useState(
    pipelineInfo.selectedExcutionUnit || EXCUTION_UNIT_LIST[0]
  );
  const [selectedEventFreshUnit, setSelectedEventFreshUnit] = useState(
    pipelineInfo.selectedEventFreshUnit || EVENT_REFRESH_UNIT_LIST[1]
  );
  const [selectedRedshiftExeUnit, setSelectedRedshiftExeUnit] = useState(
    pipelineInfo.selectedRedshiftExecutionUnit || EXCUTION_UNIT_LIST[0]
  );
  const [loadingRedshift, setLoadingRedshift] = useState(false);
  const [redshiftOptionList, setRedshiftOptionList] =
    useState<AutosuggestProps.Options>([]);

  const [redshiftRoleOptions, setRedshiftRoleOptions] =
    useState<SelectProps.Options>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // get redshift clusters by region
  const getServerlessRedshiftClusterList = async () => {
    setLoadingRedshift(true);
    try {
      const { success, data }: ApiResponse<RedshiftServerlessResponse[]> =
        await getRedshiftServerlessWorkgroup({
          region: pipelineInfo.region,
        });
      if (success) {
        const mskOptions: AutosuggestProps.Options = data.map((element) => ({
          label: element.name,
          value: element.name,
          description: element.arn,
          labelTag: element.status,
        }));
        setRedshiftOptionList(mskOptions);
        setLoadingRedshift(false);
      }
    } catch (error) {
      setLoadingRedshift(false);
    }
  };

  // get redshift serverless role
  const getServerlessRoles = async () => {
    setLoadingRoles(true);
    try {
      const { success, data }: ApiResponse<IAMRoleResponse[]> =
        await getServiceRolesByAccount({ account: pipelineInfo.arnAccountId });
      if (success) {
        const mskOptions: SelectProps.Options = data.map((element) => ({
          label: element.name,
          value: element.arn,
          iconName: 'settings',
          description: element.id,
        }));
        setRedshiftRoleOptions(mskOptions);
        setLoadingRoles(false);
      }
    } catch (error) {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    changeExecutionType(selectedExecution);
  }, [selectedExecution]);

  useEffect(() => {
    changeExecutionFixedUnit(selectedExecutionUnit);
  }, [selectedExecutionUnit]);

  useEffect(() => {
    changeRedshiftExecutionUnit(selectedRedshiftExeUnit);
  }, [selectedRedshiftExeUnit]);

  useEffect(() => {
    getServerlessRedshiftClusterList();
  }, []);

  useEffect(() => {
    if (pipelineInfo.arnAccountId) {
      getServerlessRoles();
    }
  }, [pipelineInfo.arnAccountId]);

  return (
    <SpaceBetween direction="vertical" size="l">
      <Container
        header={
          <Header
            variant="h2"
            description={
              <span>
                {t('pipeline:create.enableETLDesc1')} (
                <Link external>{t('learnMore')}</Link>){' '}
                {t('pipeline:create.enableETLDesc2')}
              </span>
            }
          >
            {t('pipeline:create.enableETL')}
          </Header>
        }
      >
        <Toggle
          onChange={({ detail }) => changeEnableDataProcessing(detail.checked)}
          checked={pipelineInfo.enableDataProcessing}
        >
          <b> {t('pipeline:create.enableETL')}</b>
        </Toggle>
      </Container>

      {pipelineInfo.enableDataProcessing && (
        <>
          <Container
            header={
              <Header
                variant="h2"
                description={t('pipeline:create.executionParamDesc')}
              >
                {t('pipeline:create.executionParam')}
              </Header>
            }
          >
            <SpaceBetween direction="vertical" size="l">
              <FormField
                label={t('pipeline:create.processInterval')}
                description={t('pipeline:create.processIntervalDesc')}
              >
                <div className="flex">
                  <div style={{ width: 200 }}>
                    <Select
                      selectedOption={selectedExecution}
                      onChange={({ detail }) => {
                        setSelectedExecution(detail.selectedOption);
                      }}
                      options={EXECUTION_TYPE_LIST}
                    />
                  </div>
                  {selectedExecution.value === ExecutionType.CRON_EXPRESS && (
                    <div className="flex-1 ml-10">
                      <SpaceBetween direction="horizontal" size="xs">
                        <Input
                          placeholder="0 15 10 * * ? *"
                          value={pipelineInfo.exeCronExp}
                          onChange={(e) => {
                            changeExecutionCronExp(e.detail.value);
                          }}
                        />
                      </SpaceBetween>
                    </div>
                  )}

                  {selectedExecution.value === ExecutionType.FIXED_RATE && (
                    <div className="flex-1 ml-10">
                      <div className="flex">
                        <Input
                          type="number"
                          placeholder="1"
                          value={pipelineInfo.excutionFixedValue}
                          onChange={(e) => {
                            changeExecutionFixedValue(e.detail.value);
                          }}
                        />
                        <div className="ml-10">
                          <Select
                            selectedOption={selectedExecutionUnit}
                            onChange={({ detail }) => {
                              setSelectedExecutionUnit(detail.selectedOption);
                            }}
                            options={EXCUTION_UNIT_LIST}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </FormField>

              <FormField
                label={t('pipeline:create.eventFreshness')}
                description={t('pipeline:create.eventFreshnessDesc')}
              >
                <div className="flex">
                  <div style={{ width: 250 }}>
                    <Input
                      type="number"
                      placeholder="3"
                      value={pipelineInfo.eventFreshValue}
                      onChange={(e) => {
                        changeEventFreshValue(e.detail.value);
                      }}
                    />
                  </div>
                  <div className="ml-10">
                    <Select
                      selectedOption={selectedEventFreshUnit}
                      onChange={({ detail }) => {
                        setSelectedEventFreshUnit(detail.selectedOption);
                        changeEventFreshUnit(detail.selectedOption);
                      }}
                      options={EVENT_REFRESH_UNIT_LIST}
                    />
                  </div>
                </div>
              </FormField>
            </SpaceBetween>
          </Container>

          {!DEFAULT_TRANSFORM_SDK_IDS.includes(
            pipelineInfo.dataCollectionSDK
          ) && (
            <PluginTable
              hideAction
              pluginType="Transform"
              selectionType="single"
              pluginSelectedItems={pipelineInfo.selectedTransformPlugins}
              changePluginSeletedItems={(items) => {
                changeTransformPlugins(items);
              }}
              title={t('pipeline:create.transform')}
              desc={
                <div>
                  {t('pipeline:create.transformDesc1')}(
                  <Link external>{t('learnMore')}</Link>){' '}
                  {t('pipeline:create.transformDesc2')}
                </div>
              }
            />
          )}

          <PluginTable
            hideAction
            pluginType="Enrich"
            selectionType="multi"
            pluginSelectedItems={pipelineInfo.selectedEnrichPlugins}
            changePluginSeletedItems={(items) => {
              changeEnrichPlugins(items);
            }}
            title={t('pipeline:create.enrichPlugins')}
            desc={t('pipeline:create.selectEnrich')}
          />

          <Container
            header={
              <Header
                variant="h2"
                description={t('pipeline:create.anlyEngineDesc')}
              >
                {t('pipeline:create.anlyEngine')}
              </Header>
            }
          >
            <SpaceBetween direction="vertical" size="s">
              <SpaceBetween direction="horizontal" size="xs">
                <Checkbox
                  checked={pipelineInfo.enableRedshift}
                  onChange={(e) => {
                    changeEnableRedshift(e.detail.checked);
                  }}
                />
                <FormField
                  label={t('pipeline:create.redshift')}
                  description={t('pipeline:create.redshiftDesc')}
                ></FormField>
              </SpaceBetween>

              {pipelineInfo.enableRedshift && (
                <>
                  <FormField
                    label={t('pipeline:create.redshiftCluster')}
                    description={t('pipeline:create.redshiftClusterDesc')}
                  >
                    <Select
                      statusType={loadingRedshift ? 'loading' : 'finished'}
                      placeholder={
                        t('pipeline:create.engineRedshiftClusterPlaceholder') ||
                        ''
                      }
                      selectedOption={pipelineInfo.selectedRedshiftCluster}
                      onChange={({ detail }) =>
                        changeSelectedRedshift(detail.selectedOption)
                      }
                      options={redshiftOptionList}
                      filteringType="auto"
                    />
                  </FormField>

                  <FormField
                    label={t('pipeline:create.accessPermissions')}
                    description={
                      <div>
                        {t('pipeline:create.accessPermissionsDesc')}
                        <Link external>
                          {t('pipeline:create.permissionLink')}
                        </Link>
                      </div>
                    }
                  >
                    <Select
                      statusType={loadingRoles ? 'loading' : 'finished'}
                      placeholder={t('pipeline:create.findIAMRole') || ''}
                      selectedOption={pipelineInfo.selectedRedshiftRole}
                      onChange={({ detail }) =>
                        changeSelectedRedshiftRole(detail.selectedOption)
                      }
                      options={redshiftRoleOptions}
                      filteringType="auto"
                    />
                  </FormField>

                  <FormField
                    label={t('pipeline:create.engineDataRange')}
                    description={t('pipeline:create.engineDataRangeDesc')}
                  >
                    <div className="flex">
                      <div style={{ width: 250 }}>
                        <div>
                          <b>{t('pipeline:create.duration')}</b>
                        </div>
                        <Input
                          placeholder={
                            t('pipeline:create.engineDurationPlaceholder') || ''
                          }
                          type="number"
                          value={pipelineInfo.redshiftExecutionValue}
                          onChange={(e) => {
                            changeRedshiftExecutionDuration(e.detail.value);
                          }}
                        />
                      </div>
                      <div className="ml-10">
                        <div>
                          <b>{t('pipeline:create.engineUnitOfTime')}</b>
                        </div>
                        <Select
                          selectedOption={selectedRedshiftExeUnit}
                          onChange={({ detail }) => {
                            setSelectedRedshiftExeUnit(detail.selectedOption);
                          }}
                          options={EXCUTION_UNIT_LIST}
                        />
                      </div>
                    </div>
                  </FormField>
                </>
              )}

              <Divider height={2} />
              <SpaceBetween direction="horizontal" size="xs">
                <Checkbox
                  checked={pipelineInfo.enableAthena}
                  onChange={(e) => {
                    changeEnableAthena(e.detail.checked);
                  }}
                />
                <FormField
                  label={t('pipeline:create.athena')}
                  description={t('pipeline:create.athenaDesc')}
                ></FormField>
              </SpaceBetween>
            </SpaceBetween>
          </Container>
        </>
      )}
    </SpaceBetween>
  );
};

export default DataProcessing;
