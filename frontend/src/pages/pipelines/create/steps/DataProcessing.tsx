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
  AutosuggestProps,
  Button,
  Checkbox,
  Container,
  ExpandableSection,
  FormField,
  Header,
  Input,
  Link,
  Multiselect,
  Select,
  SelectProps,
  SpaceBetween,
  Tiles,
  Toggle,
} from '@cloudscape-design/components';
import { OptionDefinition } from '@cloudscape-design/components/internal/components/option/interfaces';
import {
  get3AZVPCList,
  getRedshiftCluster,
  getRedshiftServerlessWorkgroup,
  getSecurityGroups,
  getServiceRolesByAccount,
  getSubnetList,
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
  REDSHIFT_CAPACITY_LIST,
  REDSHIFT_FREQUENCY_UNIT,
  REDSHIFT_UNIT_LIST,
  SUPPORT_USER_SELECT_REDSHIFT_SERVERLESS,
  SinkType,
} from 'ts/const';
import { isDisabled } from 'ts/utils';

interface DataProcessingProps {
  update?: boolean;
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

  changeRedshiftType: (type: string) => void;
  changeServerlessRedshiftVPC: (vpc: SelectProps.Option) => void;
  changeSecurityGroup: (sg: OptionDefinition[]) => void;
  changeReshiftSubnets: (subnets: OptionDefinition[]) => void;
  changeBaseCapacity: (capacity: SelectProps.Option) => void;
  changeDataLoadValue: (value: string) => void;
  changeDataLoadUnit: (unit: SelectProps.Option) => void;
  changeUpsertUserValue: (value: string) => void;
  changeUpsertUserUnit: (unit: SelectProps.Option) => void;
  changeDBUser: (user: string) => void;
  changeSelectedUpsertType: (type: SelectProps.Option) => void;
  changeUpsertCronExp: (cron: string) => void;
  changeDataLoadType: (type: SelectProps.Option) => void;
  changeDataLoadCronExp: (cron: string) => void;
  dataProcessorIntervalInvalidError: boolean;
  redshiftServerlessVpcEmptyError: boolean;
  redshiftServerlessSGEmptyError: boolean;
  redshiftServerlessSubnetEmptyError: boolean;
  redshiftServerlessSubnetInvalidError: boolean;
  redshiftProvisionedCulsterEmptyError: boolean;
  redshiftProvisionedDBUserEmptyError: boolean;
}

const DataProcessing: React.FC<DataProcessingProps> = (
  props: DataProcessingProps
) => {
  const { t } = useTranslation();
  const {
    update,
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
    changeRedshiftType,
    changeServerlessRedshiftVPC,
    changeSecurityGroup,
    changeReshiftSubnets,
    changeBaseCapacity,
    changeDataLoadValue,
    changeDataLoadUnit,
    changeUpsertUserValue,
    changeUpsertUserUnit,
    changeDBUser,
    changeSelectedUpsertType,
    changeUpsertCronExp,
    changeDataLoadType,
    changeDataLoadCronExp,
    dataProcessorIntervalInvalidError,
    redshiftServerlessVpcEmptyError,
    redshiftServerlessSGEmptyError,
    redshiftServerlessSubnetEmptyError,
    redshiftServerlessSubnetInvalidError,
    redshiftProvisionedCulsterEmptyError,
    redshiftProvisionedDBUserEmptyError,
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
    pipelineInfo.selectedRedshiftExecutionUnit || REDSHIFT_UNIT_LIST[0]
  );

  const [selectedUpsertType, setSelectedUpsertType] = useState(
    pipelineInfo.selectedUpsertType || EXECUTION_TYPE_LIST[0]
  );

  const [selectDataLoadType, setSelectDataLoadType] = useState(
    pipelineInfo.selectedDataLoadType || EXECUTION_TYPE_LIST[0]
  );

  const [loadingRedshift, setLoadingRedshift] = useState(false);
  const [loading3AZVpc, setLoading3AZVpc] = useState(false);
  const [loadingSG, setLoadingSG] = useState(false);
  const [loadingSubnets, setLoadingSubnets] = useState(false);

  const [redshiftOptionList, setRedshiftOptionList] =
    useState<AutosuggestProps.Options>([]);

  const [provisionedRedshiftOptionList, setProvisionedRedshiftOptionList] =
    useState<AutosuggestProps.Options>([]);

  const [provisionedRedshiftClusterList, setProvisionedRedshiftClusterList] =
    useState<RedshiftResponse[]>([]);

  const [redshiftRoleOptions, setRedshiftRoleOptions] =
    useState<SelectProps.Options>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const [redshiftCapacity, setRedshiftCapacity] = useState(
    pipelineInfo.redshiftBaseCapacity || REDSHIFT_CAPACITY_LIST[0]
  );
  const [threeAZVPCOptionList, setThreeAZVPCOptionList] =
    useState<SelectProps.Options>([]);
  const [vpcSGOptionList, setVpcSGOptionList] = useState<SelectProps.Options>(
    []
  );
  const [vpcThreeAZSubnetsOptionList, setVpcThreeAZSubnetsOptionList] =
    useState<SelectProps.Options>([]);
  const [dataLoadUnit, setDataLoadUnit] = useState(
    pipelineInfo.redshiftDataLoadUnit || REDSHIFT_FREQUENCY_UNIT[0]
  );
  const [upsertUserUnit, setUpsertUserUnit] = useState(
    pipelineInfo.redshiftUpsertFreqUnit || REDSHIFT_FREQUENCY_UNIT[2]
  );

  // get redshift clusters by region
  const getServerlessRedshiftClusterList = async () => {
    setLoadingRedshift(true);
    try {
      const { success, data }: ApiResponse<RedshiftServerlessResponse[]> =
        await getRedshiftServerlessWorkgroup({
          region: pipelineInfo.region,
        });
      if (success) {
        const serverlessOptions: AutosuggestProps.Options = data.map(
          (element) => ({
            label: element.name,
            value: element.name,
            description: element.arn,
            labelTag: element.status,
          })
        );
        setRedshiftOptionList(serverlessOptions);
        setLoadingRedshift(false);
      }
    } catch (error) {
      setLoadingRedshift(false);
    }
  };

  // get provisioned redshift clusters by region
  const getProvisionedRedshiftClusterList = async () => {
    setLoadingRedshift(true);
    try {
      const { success, data }: ApiResponse<RedshiftResponse[]> =
        await getRedshiftCluster({
          region: pipelineInfo.region,
        });
      if (success) {
        const provisionedOptions: AutosuggestProps.Options = data.map(
          (element) => ({
            label: element.name,
            value: element.name,
            description: element.endpoint.Address,
            labelTag: element.status,
          })
        );
        setProvisionedRedshiftClusterList(data);
        setProvisionedRedshiftOptionList(provisionedOptions);
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

  // get 3 AZ vpc list
  const getVPCListByRegion = async () => {
    setLoading3AZVpc(true);
    try {
      const { success, data }: ApiResponse<VPCResponse[]> = await get3AZVPCList(
        {
          region: pipelineInfo.region,
        }
      );
      if (success) {
        const vpcOptions: SelectProps.Options = data.map((element) => ({
          label: `${element.name}(${element.id})`,
          value: element.id,
          description: element.cidr,
        }));
        setThreeAZVPCOptionList(vpcOptions);
        setLoading3AZVpc(false);
      }
    } catch (error) {
      setLoading3AZVpc(false);
    }
  };

  // get Security Groups By VPC
  const getSecurityGroupByVPC = async (vpcId: string) => {
    setLoadingSG(true);
    setVpcSGOptionList([]);
    try {
      const { success, data }: ApiResponse<SecurityGroupResponse[]> =
        await getSecurityGroups({
          region: pipelineInfo.region,
          vpcId: vpcId,
        });
      if (success) {
        const sgOptions: SelectProps.Options = data.map((element) => ({
          label: `${element.name}(${element.id})`,
          value: element.id,
          description: element.description,
        }));
        setVpcSGOptionList(sgOptions);
      }
      setLoadingSG(false);
    } catch (error) {
      setLoadingSG(false);
    }
  };

  // get Subnets by redshift VPC
  const getSubnetsByRedshiftVPC = async (vpcId: string) => {
    setLoadingSubnets(true);
    setVpcThreeAZSubnetsOptionList([]);
    try {
      const { success, data }: ApiResponse<SubnetResponse[]> =
        await getSubnetList({
          region: pipelineInfo.region,
          vpcId: vpcId,
        });
      if (success && data) {
        const privateSubnetOptions = data.map((element) => ({
          label: `${element.name}(${element.id})`,
          value: element.id,
          description: `${element.availabilityZone}:${element.cidr}(${element.type})`,
        }));
        setVpcThreeAZSubnetsOptionList(privateSubnetOptions);
      }
      setLoadingSubnets(false);
    } catch (error) {
      setLoadingSubnets(false);
    }
  };

  useEffect(() => {
    if (pipelineInfo.redshiftServerlessVPC?.value) {
      getSecurityGroupByVPC(pipelineInfo.redshiftServerlessVPC.value);
      getSubnetsByRedshiftVPC(pipelineInfo.redshiftServerlessVPC.value);
    }
  }, [pipelineInfo.redshiftServerlessVPC?.value]);

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
    changeEventFreshUnit(selectedEventFreshUnit);
  }, [selectedEventFreshUnit]);

  useEffect(() => {
    changeBaseCapacity(redshiftCapacity);
  }, [redshiftCapacity]);

  useEffect(() => {
    changeDataLoadUnit(dataLoadUnit);
  }, [dataLoadUnit]);

  useEffect(() => {
    changeUpsertUserUnit(upsertUserUnit);
  }, [upsertUserUnit]);

  useEffect(() => {
    changeEventFreshUnit(selectedEventFreshUnit);
  }, [selectedEventFreshUnit]);

  useEffect(() => {
    changeSelectedUpsertType(selectedUpsertType);
  }, [selectedUpsertType]);

  useEffect(() => {
    changeDataLoadType(selectDataLoadType);
  }, [selectDataLoadType]);

  useEffect(() => {
    getVPCListByRegion();
    if (SUPPORT_USER_SELECT_REDSHIFT_SERVERLESS) {
      getServerlessRedshiftClusterList();
    }
    getVPCListByRegion();
  }, []);

  useEffect(() => {
    if (pipelineInfo.redshiftType === 'provisioned') {
      getProvisionedRedshiftClusterList();
    }
  }, [pipelineInfo.redshiftType]);

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
          controlId="test-processing-id"
          disabled={
            isDisabled(update, pipelineInfo) ||
            !pipelineInfo.serviceStatus.EMR_SERVERLESS ||
            (!pipelineInfo.serviceStatus.MSK &&
              pipelineInfo.ingestionServer.sinkType === SinkType.MSK)
          }
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
                errorText={
                  dataProcessorIntervalInvalidError
                    ? t('pipeline:valid.dataProcessorIntervalError')
                    : ''
                }
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
              showRefresh
              pluginType="Transform"
              selectionType="single"
              pluginSelectedItems={pipelineInfo.selectedTransformPlugins}
              selectBuitInPlugins={!update}
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
            showRefresh
            pluginType="Enrich"
            selectionType="multi"
            pluginSelectedItems={pipelineInfo.selectedEnrichPlugins}
            selectBuitInPlugins={!update}
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
                  disabled={isDisabled(update, pipelineInfo)}
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
                  <Tiles
                    onChange={({ detail }) => {
                      changeRedshiftType(detail.value);
                    }}
                    value={pipelineInfo.redshiftType}
                    items={[
                      {
                        controlId: 'test-redshift-serverless-id',
                        label: t('pipeline:create.redshiftServerless'),
                        description: t(
                          'pipeline:create.redshiftServerlessDesc'
                        ),
                        value: 'serverless',
                        disabled:
                          isDisabled(update, pipelineInfo) ||
                          !pipelineInfo.serviceStatus.REDSHIFT_SERVERLESS,
                      },
                      {
                        controlId: 'test-redshift-provisioned-id',
                        label: t('pipeline:create.redshiftProvisioned'),
                        description: t(
                          'pipeline:create.redshiftProvisionedDesc'
                        ),
                        value: 'provisioned',
                        disabled: isDisabled(update, pipelineInfo),
                      },
                    ]}
                  />

                  {pipelineInfo.redshiftType === 'serverless' && (
                    <>
                      {SUPPORT_USER_SELECT_REDSHIFT_SERVERLESS ? (
                        <>
                          <FormField
                            label={t('pipeline:create.redshiftCluster')}
                            description={t(
                              'pipeline:create.redshiftClusterDesc'
                            )}
                            secondaryControl={
                              <Button
                                loading={loadingRedshift}
                                iconName="refresh"
                                onClick={() => {
                                  getServerlessRedshiftClusterList();
                                }}
                              />
                            }
                          >
                            <Select
                              statusType={
                                loadingRedshift ? 'loading' : 'finished'
                              }
                              placeholder={
                                t(
                                  'pipeline:create.engineRedshiftClusterPlaceholder'
                                ) || ''
                              }
                              selectedOption={
                                pipelineInfo.selectedRedshiftCluster
                              }
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
                            secondaryControl={
                              <Button
                                loading={loadingRoles}
                                iconName="refresh"
                                onClick={() => {
                                  getServerlessRoles();
                                }}
                              />
                            }
                          >
                            <Select
                              statusType={loadingRoles ? 'loading' : 'finished'}
                              placeholder={
                                t('pipeline:create.findIAMRole') || ''
                              }
                              selectedOption={pipelineInfo.selectedRedshiftRole}
                              onChange={({ detail }) =>
                                changeSelectedRedshiftRole(
                                  detail.selectedOption
                                )
                              }
                              options={redshiftRoleOptions}
                              filteringType="auto"
                            />
                          </FormField>
                        </>
                      ) : (
                        <>
                          <FormField
                            label={t('pipeline:create.redshiftBaseCapacity')}
                            description={t(
                              'pipeline:create.redshiftBaseCapacityDesc'
                            )}
                          >
                            <Select
                              disabled={
                                !pipelineInfo.serviceStatus.REDSHIFT_SERVERLESS
                              }
                              selectedOption={redshiftCapacity}
                              onChange={({ detail }) =>
                                setRedshiftCapacity(detail.selectedOption)
                              }
                              options={REDSHIFT_CAPACITY_LIST}
                              selectedAriaLabel="Selected"
                            />
                          </FormField>

                          <FormField
                            label={t('pipeline:create.redshiftVpc')}
                            description={t('pipeline:create.redshiftVpcDesc')}
                            errorText={
                              redshiftServerlessVpcEmptyError
                                ? t(
                                    'pipeline:valid.redshiftServerlessVpcEmptyError'
                                  )
                                : ''
                            }
                          >
                            <Select
                              disabled={
                                isDisabled(update, pipelineInfo) ||
                                !pipelineInfo.serviceStatus.REDSHIFT_SERVERLESS
                              }
                              placeholder={
                                t('pipeline:create.vpcPlaceholder') || ''
                              }
                              selectedOption={
                                pipelineInfo.redshiftServerlessVPC
                              }
                              options={threeAZVPCOptionList}
                              selectedAriaLabel="Selected"
                              statusType={
                                loading3AZVpc ? 'loading' : 'finished'
                              }
                              onChange={(e) => {
                                changeServerlessRedshiftVPC(
                                  e.detail.selectedOption
                                );
                              }}
                            />
                          </FormField>

                          <FormField
                            label={t('pipeline:create.securityGroup')}
                            description={t(
                              'pipeline:create.redshiftSecurityGroupDesc'
                            )}
                            errorText={
                              redshiftServerlessSGEmptyError
                                ? t(
                                    'pipeline:valid.redshiftServerlessSGEmptyError'
                                  )
                                : ''
                            }
                          >
                            <Multiselect
                              disabled={
                                isDisabled(update, pipelineInfo) ||
                                !pipelineInfo.serviceStatus.REDSHIFT_SERVERLESS
                              }
                              selectedOptions={
                                pipelineInfo.redshiftServerlessSG
                              }
                              tokenLimit={2}
                              deselectAriaLabel={(e) =>
                                `${t('remove')} ${e.label}`
                              }
                              options={vpcSGOptionList}
                              placeholder={
                                t('pipeline:create.securityGroupPlaceholder') ||
                                ''
                              }
                              statusType={loadingSG ? 'loading' : 'finished'}
                              onChange={(e) => {
                                changeSecurityGroup(
                                  e.detail.selectedOptions as any
                                );
                              }}
                            />
                          </FormField>

                          <FormField
                            label={t('pipeline:create.redshiftSubnet')}
                            description={t(
                              'pipeline:create.redshiftSubnetDesc'
                            )}
                            errorText={
                              redshiftServerlessSubnetEmptyError
                                ? t(
                                    'pipeline:valid.redshiftServerlessSubnetEmptyError'
                                  )
                                : redshiftServerlessSubnetInvalidError
                                ? t(
                                    'pipeline:valid.redshiftServerlessSubnetInvalidError'
                                  )
                                : ''
                            }
                          >
                            <Multiselect
                              disabled={
                                isDisabled(update, pipelineInfo) ||
                                !pipelineInfo.serviceStatus.REDSHIFT_SERVERLESS
                              }
                              selectedOptions={
                                pipelineInfo.redshiftServerlessSubnets
                              }
                              tokenLimit={4}
                              deselectAriaLabel={(e) =>
                                `${t('remove')} ${e.label}`
                              }
                              options={vpcThreeAZSubnetsOptionList}
                              placeholder={
                                t('pipeline:create.subnetPlaceholder') || ''
                              }
                              statusType={
                                loadingSubnets ? 'loading' : 'finished'
                              }
                              onChange={(e) => {
                                changeReshiftSubnets(
                                  e.detail.selectedOptions as any
                                );
                              }}
                            />
                          </FormField>
                        </>
                      )}
                    </>
                  )}

                  {pipelineInfo.redshiftType === 'provisioned' && (
                    <>
                      <FormField
                        label={t('pipeline:create.redshiftCluster')}
                        description={t('pipeline:create.redshiftClusterDesc')}
                        errorText={
                          redshiftProvisionedCulsterEmptyError
                            ? t(
                                'pipeline:valid.redshiftProvisionedCulsterEmptyError'
                              )
                            : ''
                        }
                        secondaryControl={
                          <Button
                            loading={loadingRedshift}
                            iconName="refresh"
                            onClick={() => {
                              getProvisionedRedshiftClusterList();
                            }}
                          />
                        }
                      >
                        <Select
                          disabled={isDisabled(update, pipelineInfo)}
                          statusType={loadingRedshift ? 'loading' : 'finished'}
                          placeholder={
                            t(
                              'pipeline:create.engineRedshiftClusterPlaceholder'
                            ) || ''
                          }
                          selectedOption={pipelineInfo.selectedRedshiftCluster}
                          onChange={({ detail }) => {
                            changeSelectedRedshift(detail.selectedOption);
                            const clusters: RedshiftResponse[] =
                              provisionedRedshiftClusterList.filter(
                                (cluster) =>
                                  cluster.name === detail.selectedOption.value
                              );
                            changeDBUser(clusters[0].masterUsername);
                          }}
                          options={provisionedRedshiftOptionList}
                          filteringType="auto"
                        />
                      </FormField>

                      <FormField
                        label={t('pipeline:create.redshiftDatabaseUser')}
                        description={t(
                          'pipeline:create.redshiftDatabaseUserDesc'
                        )}
                        errorText={
                          redshiftProvisionedDBUserEmptyError
                            ? t(
                                'pipeline:valid.redshiftProvisionedDBUserEmptyError'
                              )
                            : ''
                        }
                      >
                        <Input
                          placeholder={
                            t(
                              'pipeline:create.redshiftDatabaseUserPlaceholder'
                            ) || ''
                          }
                          value={
                            pipelineInfo.dataAnalytics.redshift.provisioned
                              .dbUser
                          }
                          onChange={(e) => {
                            changeDBUser(e.detail.value);
                          }}
                        />
                      </FormField>
                    </>
                  )}

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
                          placeholder="6"
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
                          options={REDSHIFT_UNIT_LIST}
                        />
                      </div>
                    </div>
                  </FormField>

                  <ExpandableSection
                    headerText={t('pipeline:create.redshiftAdditionalSettings')}
                  >
                    <SpaceBetween direction="vertical" size="s">
                      <FormField
                        label={t('pipeline:create.redshiftDataLoadFrequency')}
                        description={t(
                          'pipeline:create.redshiftDataLoadFrequencyDesc'
                        )}
                      >
                        <div className="flex">
                          <div style={{ width: 200 }}>
                            <Select
                              selectedOption={selectDataLoadType}
                              onChange={({ detail }) => {
                                setSelectDataLoadType(detail.selectedOption);
                              }}
                              options={EXECUTION_TYPE_LIST}
                            />
                          </div>
                          {selectDataLoadType.value ===
                            ExecutionType.CRON_EXPRESS && (
                            <div className="flex-1 ml-10">
                              <SpaceBetween direction="horizontal" size="xs">
                                <Input
                                  placeholder="0 5 * * ? *"
                                  value={pipelineInfo.dataLoadCronExp}
                                  onChange={(e) => {
                                    changeDataLoadCronExp(e.detail.value);
                                  }}
                                />
                              </SpaceBetween>
                            </div>
                          )}

                          {selectDataLoadType.value ===
                            ExecutionType.FIXED_RATE && (
                            <div className="flex  ml-10">
                              <div style={{ width: 250 }}>
                                <Input
                                  type="number"
                                  placeholder="5"
                                  value={pipelineInfo.redshiftDataLoadValue}
                                  onChange={(e) => {
                                    changeDataLoadValue(e.detail.value);
                                  }}
                                />
                              </div>
                              <div className="ml-10">
                                <Select
                                  selectedOption={dataLoadUnit}
                                  onChange={({ detail }) => {
                                    setDataLoadUnit(detail.selectedOption);
                                  }}
                                  options={REDSHIFT_FREQUENCY_UNIT}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </FormField>
                      <FormField
                        label={t(
                          'pipeline:create.redshiftUserTableUpsertFrequency'
                        )}
                        description={t(
                          'pipeline:create.redshiftUserTableUpsertFrequencyDesc'
                        )}
                      >
                        <div className="flex">
                          <div style={{ width: 200 }}>
                            <Select
                              selectedOption={selectedUpsertType}
                              onChange={({ detail }) => {
                                setSelectedUpsertType(detail.selectedOption);
                              }}
                              options={EXECUTION_TYPE_LIST}
                            />
                          </div>
                          {selectedUpsertType.value ===
                            ExecutionType.CRON_EXPRESS && (
                            <div className="flex-1 ml-10">
                              <SpaceBetween direction="horizontal" size="xs">
                                <Input
                                  placeholder="0 1 * * ? *"
                                  value={pipelineInfo.upsertCronExp}
                                  onChange={(e) => {
                                    changeUpsertCronExp(e.detail.value);
                                  }}
                                />
                              </SpaceBetween>
                            </div>
                          )}

                          {selectedUpsertType.value ===
                            ExecutionType.FIXED_RATE && (
                            <div className="flex  ml-10">
                              <div style={{ width: 250 }}>
                                <Input
                                  type="number"
                                  placeholder="5"
                                  value={pipelineInfo.redshiftUpsertFreqValue}
                                  onChange={(e) => {
                                    changeUpsertUserValue(e.detail.value);
                                  }}
                                />
                              </div>
                              <div className="ml-10">
                                <Select
                                  selectedOption={upsertUserUnit}
                                  onChange={({ detail }) => {
                                    setUpsertUserUnit(detail.selectedOption);
                                  }}
                                  options={REDSHIFT_FREQUENCY_UNIT}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </FormField>
                    </SpaceBetween>
                  </ExpandableSection>
                </>
              )}

              <Divider height={2} />
              <SpaceBetween direction="horizontal" size="xs">
                <Checkbox
                  disabled={isDisabled(update, pipelineInfo)}
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
