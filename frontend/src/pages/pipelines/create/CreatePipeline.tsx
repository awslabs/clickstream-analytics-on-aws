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

import { AppLayout, Wizard } from '@cloudscape-design/components';
import {
  createProjectPipeline,
  getPipelineDetail,
  updateProjectPipeline,
} from 'apis/pipeline';
import { getPluginList } from 'apis/plugin';
import {
  get3AZVPCList,
  getCertificates,
  getMSKList,
  getQuickSightUsers,
  getRedshiftCluster,
  getSSMSecrets,
  getSecurityGroups,
  getSubnetList,
  getVPCList,
} from 'apis/resource';
import Loading from 'components/common/Loading';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import { AppContext } from 'context/AppContext';
import cloneDeep from 'lodash/cloneDeep';
import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AWS_REGION_MAP,
  DEFAULT_KDS_BATCH_SIZE,
  DEFAULT_KDS_SINK_INTERVAL,
  DEFAULT_MSK_BATCH_SIZE,
  DEFAULT_MSK_SINK_INTERVAL,
  EXCUTION_UNIT_LIST,
  EXECUTION_TYPE_LIST,
  ExecutionType,
  KDS_TYPE,
  MAX_KDS_BATCH_SIZE,
  MAX_KDS_SINK_INTERVAL,
  MAX_MSK_BATCH_SIZE,
  MAX_MSK_SINK_INTERVAL,
  MIN_KDS_BATCH_SIZE,
  MIN_KDS_SINK_INTERVAL,
  MIN_MSK_BATCH_SIZE,
  MIN_MSK_SINK_INTERVAL,
  ProtocalType,
  REDSHIFT_CAPACITY_LIST,
  REDSHIFT_UNIT_LIST,
  ResourceCreateMehod,
  SDK_LIST,
  SinkType,
} from 'ts/const';
import { INIT_EXT_PIPELINE_DATA } from 'ts/init';
import {
  extractAccountIdFromArn,
  generateCronDateRange,
  generateRedshiftInterval,
  isEmpty,
  reverseCronDateRange,
  reverseFreshnessInHour,
  reverseRedshiftInterval,
} from 'ts/utils';
import BasicInformation from './steps/BasicInformation';
import ConfigIngestion from './steps/ConfigIngestion';
import DataProcessing from './steps/DataProcessing';
import Reporting from './steps/Reporting';
import ReviewAndLaunch from './steps/ReviewAndLaunch';

interface ContentProps {
  update?: boolean;
  updatePipeline?: IExtPipeline;
}

const Content: React.FC<ContentProps> = (props: ContentProps) => {
  const { update, updatePipeline } = props;
  const { projectId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const appConfig = useContext(AppContext);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [regionEmptyError, setRegionEmptyError] = useState(false);
  const [vpcEmptyError, setVPCEmptyError] = useState(false);
  const [sdkEmptyError, setSDKEmptyError] = useState(false);
  const [assetsBucketEmptyError, setAssetsBucketEmptyError] = useState(false);

  const [publicSubnetError, setPublicSubnetError] = useState(false);
  const [privateSubnetError, setPrivateSubnetError] = useState(false);
  const [domainNameEmptyError, setDomainNameEmptyError] = useState(false);
  const [certificateEmptyError, setCertificateEmptyError] = useState(false);

  const [sinkBatchSizeError, setSinkBatchSizeError] = useState(false);
  const [sinkIntervalError, setSinkIntervalError] = useState(false);

  const [bufferS3BucketEmptyError, setBufferS3BucketEmptyError] =
    useState(false);
  const [
    dataProcessorIntervalInvalidError,
    setDataProcessorIntervalInvalidError,
  ] = useState(false);

  const [acknowledgedHTTPSecurity, setAcknowledgedHTTPSecurity] =
    useState(true);

  const [pipelineInfo, setPipelineInfo] = useState<IExtPipeline>(
    updatePipeline
      ? updatePipeline
      : {
          ...INIT_EXT_PIPELINE_DATA,
          projectId: projectId ?? ''.toString(),
          tags: [
            {
              key: 'aws-solution/name',
              value: 'Clickstream',
              existing: true,
            },
            {
              key: 'aws-solution/version',
              value: appConfig?.solution_version,
              existing: true,
            },
            {
              key: 'aws-solution/clickstream/project',
              value: projectId,
              existing: true,
            },
          ],
        }
  );

  const validateBasicInfo = () => {
    if (!pipelineInfo.selectedRegion) {
      setRegionEmptyError(true);
      return false;
    }
    if (!pipelineInfo.selectedVPC) {
      setVPCEmptyError(true);
      return false;
    }
    if (!pipelineInfo.dataCollectionSDK) {
      setSDKEmptyError(true);
      return false;
    }
    if (!pipelineInfo.ingestionServer.loadBalancer.logS3Bucket.name) {
      setAssetsBucketEmptyError(true);
      return false;
    }
    return true;
  };

  const validateIngestionServer = () => {
    if (pipelineInfo.selectedPublicSubnet.length <= 0) {
      setPublicSubnetError(true);
      return false;
    }
    if (pipelineInfo.selectedPrivateSubnet.length <= 0) {
      setPrivateSubnetError(true);
      return false;
    }
    if (
      pipelineInfo.ingestionServer.loadBalancer.protocol === ProtocalType.HTTPS
    ) {
      if (!pipelineInfo.ingestionServer.domain.domainName.trim()) {
        setDomainNameEmptyError(true);
        return false;
      }
      if (!pipelineInfo.selectedCertificate) {
        setCertificateEmptyError(true);
        return false;
      }
    }
    if (pipelineInfo.ingestionServer.sinkType === SinkType.S3) {
      if (!pipelineInfo.ingestionServer.sinkS3.sinkBucket.name.trim()) {
        setBufferS3BucketEmptyError(true);
        return false;
      }
    }
    if (
      pipelineInfo.ingestionServer.loadBalancer.protocol ===
        ProtocalType.HTTP &&
      !acknowledgedHTTPSecurity
    ) {
      return false;
    }

    const sinkIntervalNum =
      pipelineInfo.ingestionServer.sinkBatch?.intervalSeconds;
    const sinkBatchSize = pipelineInfo.ingestionServer.sinkBatch?.size;
    if (pipelineInfo.ingestionServer.sinkType === SinkType.KDS) {
      // check kds batch interval
      if (
        sinkIntervalNum < MIN_KDS_SINK_INTERVAL ||
        sinkIntervalNum > MAX_KDS_SINK_INTERVAL
      ) {
        setSinkIntervalError(true);
        return false;
      }
      // check kds batch size
      if (
        sinkBatchSize < MIN_KDS_BATCH_SIZE ||
        sinkBatchSize > MAX_KDS_BATCH_SIZE
      ) {
        setSinkBatchSizeError(true);
        return false;
      }
    }

    if (pipelineInfo.ingestionServer.sinkType === SinkType.MSK) {
      // check msk batch interval
      if (
        sinkIntervalNum < MIN_MSK_SINK_INTERVAL ||
        sinkIntervalNum > MAX_MSK_SINK_INTERVAL
      ) {
        setSinkIntervalError(true);
        return false;
      }
      // check msk batch size
      if (
        sinkBatchSize < MIN_MSK_BATCH_SIZE ||
        sinkBatchSize > MAX_MSK_BATCH_SIZE
      ) {
        setSinkBatchSizeError(true);
        return false;
      }
    }
    return true;
  };

  const validateDataProcessing = () => {
    // check data processing interval
    if (
      pipelineInfo.selectedExcutionType?.value === ExecutionType.FIXED_RATE &&
      parseInt(pipelineInfo.excutionFixedValue) < 3 &&
      pipelineInfo.selectedExcutionUnit?.value === 'minute'
    ) {
      setDataProcessorIntervalInvalidError(true);
      return false;
    }
    return true;
  };

  const confirmCreatePipeline = async () => {
    const createPipelineObj: any = cloneDeep(pipelineInfo);
    if (createPipelineObj.enableDataProcessing) {
      createPipelineObj.etl.dataFreshnessInHour =
        pipelineInfo.selectedEventFreshUnit?.value === 'day'
          ? parseInt(pipelineInfo.eventFreshValue) * 24
          : parseInt(pipelineInfo.eventFreshValue) || 72;

      createPipelineObj.etl.scheduleExpression = generateCronDateRange(
        pipelineInfo.selectedExcutionType?.value,
        parseInt(pipelineInfo.excutionFixedValue),
        pipelineInfo.exeCronExp,
        pipelineInfo.selectedExcutionUnit,
        'processing'
      );

      // set plugin value
      createPipelineObj.etl.transformPlugin =
        pipelineInfo.selectedTransformPlugins?.[0]?.id || '';
      createPipelineObj.etl.enrichPlugin =
        pipelineInfo.selectedEnrichPlugins.map((element) => element.id);

      // set redshift schedule
      createPipelineObj.dataAnalytics.redshift.dataRange =
        generateRedshiftInterval(
          parseInt(pipelineInfo.redshiftExecutionValue),
          pipelineInfo.selectedRedshiftExecutionUnit?.value
        );

      // set redshift dataload frequency
      createPipelineObj.dataAnalytics.loadWorkflow.loadJobScheduleIntervalExpression =
        generateCronDateRange(
          pipelineInfo.selectedDataLoadType?.value,
          parseInt(pipelineInfo.redshiftDataLoadValue),
          pipelineInfo.dataLoadCronExp,
          pipelineInfo.redshiftDataLoadUnit,
          'dataload'
        );

      // set redshift upsert frequency express
      createPipelineObj.dataAnalytics.upsertUsers.scheduleExpression =
        generateCronDateRange(
          pipelineInfo.selectedUpsertType?.value,
          parseInt(pipelineInfo.redshiftUpsertFreqValue),
          pipelineInfo.upsertCronExp,
          pipelineInfo.redshiftUpsertFreqUnit,
          'upsert'
        );

      // set dataAnalytics to null when not enable Redshift
      if (!pipelineInfo.enableRedshift) {
        createPipelineObj.dataAnalytics = null;
      } else {
        // set serverless to null when user select provisioned
        if (pipelineInfo.redshiftType === 'provisioned') {
          createPipelineObj.dataAnalytics.redshift.newServerless = null;
        }

        // set provisioned to null when user select serverless
        if (pipelineInfo.redshiftType === 'serverless') {
          createPipelineObj.dataAnalytics.redshift.provisioned = null;
        }
      }
    } else {
      createPipelineObj.etl = null;
      // set dataAnalytics to null when disable data processing
      createPipelineObj.dataAnalytics = null;
    }

    // set sink batch to null when sink type is S3
    if (pipelineInfo.ingestionServer.sinkType === SinkType.S3) {
      createPipelineObj.ingestionServer.sinkBatch = null;
    }

    // set msk cluster when user selected self-hosted
    if (createPipelineObj.kafkaSelfHost) {
      createPipelineObj.ingestionServer.sinkKafka.mskCluster = null;
    }

    // set authenticationSecretArn empty when not enable authentication
    if (!createPipelineObj.enableAuthentication) {
      createPipelineObj.ingestionServer.loadBalancer.authenticationSecretArn =
        null;
    }

    // set report empty when not enable report
    if (!createPipelineObj.enableReporting) {
      createPipelineObj.report = null;
    }

    // remove temporary properties
    delete createPipelineObj.selectedRegion;
    delete createPipelineObj.selectedVPC;
    delete createPipelineObj.selectedSDK;
    delete createPipelineObj.selectedPublicSubnet;
    delete createPipelineObj.selectedPrivateSubnet;
    delete createPipelineObj.enableEdp;
    delete createPipelineObj.selectedCertificate;

    delete createPipelineObj.mskCreateMethod;
    delete createPipelineObj.selectedMSK;
    delete createPipelineObj.seledtedKDKProvisionType;

    delete createPipelineObj.enableDataProcessing;
    delete createPipelineObj.scheduleExpression;

    delete createPipelineObj.exeCronExp;
    delete createPipelineObj.excutionFixedValue;
    delete createPipelineObj.enableRedshift;

    delete createPipelineObj.enableAthena;
    delete createPipelineObj.eventFreshValue;

    delete createPipelineObj.redshiftExecutionValue;
    delete createPipelineObj.selectedExcutionType;
    delete createPipelineObj.selectedExcutionUnit;
    delete createPipelineObj.selectedEventFreshUnit;
    delete createPipelineObj.selectedRedshiftCluster;
    delete createPipelineObj.selectedRedshiftRole;
    delete createPipelineObj.selectedRedshiftExecutionUnit;
    delete createPipelineObj.selectedTransformPlugins;
    delete createPipelineObj.selectedEnrichPlugins;
    delete createPipelineObj.selectedSecret;

    delete createPipelineObj.kafkaSelfHost;
    delete createPipelineObj.kafkaBrokers;

    delete createPipelineObj.arnAccountId;
    delete createPipelineObj.enableReporting;
    delete createPipelineObj.selectedQuickSightUser;
    delete createPipelineObj.dataConnectionType;
    delete createPipelineObj.quickSightVpcConnection;
    delete createPipelineObj.enableAuthentication;

    delete createPipelineObj.redshiftType;
    delete createPipelineObj.redshiftServerlessVPC;
    delete createPipelineObj.redshiftBaseCapacity;
    delete createPipelineObj.redshiftServerlessSG;
    delete createPipelineObj.redshiftServerlessSubnets;
    delete createPipelineObj.redshiftDataLoadValue;
    delete createPipelineObj.redshiftDataLoadUnit;
    delete createPipelineObj.redshiftUpsertFreqValue;
    delete createPipelineObj.redshiftUpsertFreqUnit;

    delete createPipelineObj.selectedSelfHostedMSKSG;
    delete createPipelineObj.selectedUpsertType;
    delete createPipelineObj.upsertCronExp;

    delete createPipelineObj.selectedDataLoadType;
    delete createPipelineObj.dataLoadCronExp;

    setLoadingCreate(true);
    try {
      if (!update) {
        const { success, data }: ApiResponse<ResponseCreate> =
          await createProjectPipeline(createPipelineObj);
        if (success && data.id) {
          navigate(`/project/detail/${projectId}`);
        }
      } else {
        const { success, data }: ApiResponse<ResponseCreate> =
          await updateProjectPipeline(createPipelineObj);
        if (success && data.id) {
          navigate(
            `/project/${pipelineInfo.projectId}/pipeline/${pipelineInfo.pipelineId}`
          );
        }
      }
      setLoadingCreate(false);
    } catch (error) {
      setLoadingCreate(false);
    }
  };

  return (
    <Wizard
      i18nStrings={{
        stepNumberLabel: (stepNumber) => `${t('step')} ${stepNumber}`,
        collapsedStepsLabel: (stepNumber, stepsCount) =>
          `${t('step')} ${stepNumber} ${t('of')} ${stepsCount}`,
        navigationAriaLabel: t('steps') || 'Steps',
        cancelButton: t('button.cancel') || '',
        previousButton: t('button.previous') || '',
        nextButton: t('button.next') || '',
        submitButton: update ? t('button.save') : t('button.create'),
        optional: t('optional') || 'optional',
      }}
      onNavigate={({ detail }) => {
        if (detail.requestedStepIndex === 1 && !validateBasicInfo()) {
          return;
        }
        if (detail.requestedStepIndex === 2 && !validateIngestionServer()) {
          return;
        }
        if (detail.requestedStepIndex === 3 && !validateDataProcessing()) {
          return;
        }
        setActiveStepIndex(detail.requestedStepIndex);
      }}
      onCancel={() => {
        navigate(-1);
      }}
      onSubmit={() => {
        if (!validateBasicInfo()) {
          setActiveStepIndex(0);
          return;
        }
        if (!validateIngestionServer()) {
          setActiveStepIndex(1);
          return;
        }
        confirmCreatePipeline();
      }}
      isLoadingNextStep={loadingCreate}
      activeStepIndex={activeStepIndex}
      steps={[
        {
          title: t('pipeline:create.basicInfo'),
          content: (
            <BasicInformation
              update={update}
              regionEmptyError={regionEmptyError}
              vpcEmptyError={vpcEmptyError}
              sdkEmptyError={sdkEmptyError}
              pipelineInfo={pipelineInfo}
              assetsS3BucketEmptyError={assetsBucketEmptyError}
              changeRegion={(region) => {
                setRegionEmptyError(false);
                setVPCEmptyError(false);
                setPublicSubnetError(false);
                setPrivateSubnetError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedRegion: region,
                    region: region.value || '',
                    selectedVPC: null,
                    selectedPublicSubnet: [],
                    selectedPrivateSubnet: [],
                  };
                });
              }}
              changeVPC={(vpc) => {
                setVPCEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedVPC: vpc,
                    network: {
                      ...prev.network,
                      vpcId: vpc.value || '',
                    },
                  };
                });
              }}
              changeSDK={(sdk) => {
                setSDKEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedSDK: sdk,
                    dataCollectionSDK: sdk.value || '',
                  };
                });
              }}
              changeS3Bucket={(bucket) => {
                setAssetsBucketEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    bucket: {
                      ...prev.bucket,
                      name: bucket,
                    },
                    ingestionServer: {
                      ...prev.ingestionServer,
                      loadBalancer: {
                        ...prev.ingestionServer.loadBalancer,
                        logS3Bucket: {
                          ...prev.ingestionServer.loadBalancer.logS3Bucket,
                          name: bucket,
                        },
                      },
                      sinkKinesis: {
                        ...prev.ingestionServer.sinkKinesis,
                        sinkBucket: {
                          ...prev.ingestionServer.sinkKinesis.sinkBucket,
                          name: bucket,
                        },
                      },
                    },
                    etl: {
                      ...prev.etl,
                      sourceS3Bucket: {
                        ...prev.etl.sourceS3Bucket,
                        name: bucket,
                      },
                      sinkS3Bucket: {
                        ...prev.etl.sinkS3Bucket,
                        name: bucket,
                      },
                      pipelineBucket: {
                        ...prev.etl.pipelineBucket,
                        name: bucket,
                      },
                    },
                  };
                });
              }}
              changeTags={(tags) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    tags: tags,
                  };
                });
              }}
            />
          ),
        },
        {
          title: t('pipeline:create.configIngestion'),
          content: (
            <ConfigIngestion
              update={update}
              pipelineInfo={pipelineInfo}
              publicSubnetError={publicSubnetError}
              privateSubnetError={privateSubnetError}
              domainNameEmptyError={domainNameEmptyError}
              certificateEmptyError={certificateEmptyError}
              bufferS3BucketEmptyError={bufferS3BucketEmptyError}
              acknowledgedHTTPSecurity={acknowledgedHTTPSecurity}
              sinkBatchSizeError={sinkBatchSizeError}
              sinkIntervalError={sinkIntervalError}
              changePublicSubnets={(subnets) => {
                setPublicSubnetError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedPublicSubnet: subnets,
                    network: {
                      ...prev.network,
                      publicSubnetIds: subnets.map(
                        (element) => element.value || ''
                      ),
                    },
                  };
                });
              }}
              changePrivateSubnets={(subnets) => {
                setPrivateSubnetError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedPrivateSubnet: subnets,
                    network: {
                      ...prev.network,
                      privateSubnetIds: subnets.map(
                        (element) => element.value || ''
                      ),
                    },
                  };
                });
              }}
              changeServerMin={(min) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      size: {
                        ...prev.ingestionServer.size,
                        serverMin: parseInt(min),
                      },
                    },
                  };
                });
              }}
              changeServerMax={(max) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      size: {
                        ...prev.ingestionServer.size,
                        serverMax: parseInt(max),
                      },
                    },
                  };
                });
              }}
              changeWarmSize={(size) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      size: {
                        ...prev.ingestionServer.size,
                        warmPoolSize: parseInt(size),
                      },
                    },
                  };
                });
              }}
              changeDomainName={(name) => {
                setDomainNameEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      domain: {
                        ...prev.ingestionServer.domain,
                        domainName: name,
                      },
                    },
                  };
                });
              }}
              changeEnableALBAccessLog={(enable) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      loadBalancer: {
                        ...prev.ingestionServer.loadBalancer,
                        enableApplicationLoadBalancerAccessLog: enable,
                      },
                    },
                  };
                });
              }}
              changeEnableALBAuthentication={(enable) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    enableAuthentication: enable,
                  };
                });
              }}
              changeEnableAGA={(enable) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      loadBalancer: {
                        ...prev.ingestionServer.loadBalancer,
                        enableGlobalAccelerator: enable,
                      },
                    },
                  };
                });
              }}
              changeProtocal={(protocal) => {
                if (protocal === ProtocalType.HTTP) {
                  setAcknowledgedHTTPSecurity(false);
                }
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      loadBalancer: {
                        ...prev.ingestionServer.loadBalancer,
                        protocol: protocal,
                      },
                    },
                  };
                });
              }}
              changeAckownledge={() => {
                setAcknowledgedHTTPSecurity(true);
              }}
              changeServerEdp={(endpoint) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      loadBalancer: {
                        ...prev.ingestionServer.loadBalancer,
                        serverEndpointPath: endpoint,
                      },
                    },
                  };
                });
              }}
              changeServerCors={(cors) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      loadBalancer: {
                        ...prev.ingestionServer.loadBalancer,
                        serverCorsOrigin: cors,
                      },
                    },
                  };
                });
              }}
              changeCertificate={(cert) => {
                setCertificateEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedCertificate: cert,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      domain: {
                        ...prev.ingestionServer.domain,
                        certificateArn: cert.value || '',
                      },
                    },
                  };
                });
              }}
              changeSSMSecret={(secret) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedSecret: secret,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      loadBalancer: {
                        ...prev.ingestionServer.loadBalancer,
                        authenticationSecretArn: secret?.value || '',
                      },
                    },
                  };
                });
              }}
              changeBufferType={(type) => {
                let sinkInterval = '';
                let sinkBatchSize = '';
                if (type === SinkType.KDS) {
                  sinkInterval = DEFAULT_KDS_SINK_INTERVAL;
                  sinkBatchSize = DEFAULT_KDS_BATCH_SIZE;
                }
                if (type === SinkType.MSK) {
                  sinkInterval = DEFAULT_MSK_SINK_INTERVAL;
                  sinkBatchSize = DEFAULT_MSK_BATCH_SIZE;
                }
                setSinkIntervalError(false);
                setSinkBatchSizeError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkType: type,
                      sinkBatch: {
                        intervalSeconds: parseInt(sinkInterval),
                        size: parseInt(sinkBatchSize),
                      },
                    },
                  };
                });
              }}
              changeSinkMaxInterval={(interval) => {
                setSinkIntervalError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkBatch: {
                        ...prev.ingestionServer.sinkBatch,
                        intervalSeconds: parseInt(interval),
                      },
                    },
                  };
                });
              }}
              changeSinkBatchSize={(size) => {
                setSinkBatchSizeError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkBatch: {
                        ...prev.ingestionServer.sinkBatch,
                        size: parseInt(size),
                      },
                    },
                  };
                });
              }}
              changeBufferS3Bucket={(bucket) => {
                setBufferS3BucketEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkS3: {
                        ...prev.ingestionServer.sinkS3,
                        sinkBucket: {
                          ...prev.ingestionServer.sinkS3.sinkBucket,
                          name: bucket,
                        },
                      },
                    },
                  };
                });
              }}
              changeBufferS3Prefix={(prefix) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkS3: {
                        ...prev.ingestionServer.sinkS3,
                        sinkBucket: {
                          ...prev.ingestionServer.sinkS3.sinkBucket,
                          prefix: prefix,
                        },
                      },
                    },
                  };
                });
              }}
              changeS3BufferSize={(size) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkS3: {
                        ...prev.ingestionServer.sinkS3,
                        s3BufferSize: parseInt(size),
                      },
                    },
                  };
                });
              }}
              changeBufferInterval={(interval) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkS3: {
                        ...prev.ingestionServer.sinkS3,
                        s3BufferInterval: parseInt(interval),
                      },
                    },
                  };
                });
              }}
              changeCreateMSKMethod={(type) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    mskCreateMethod: type,
                  };
                });
              }}
              changeSelectedMSK={(mskOption, mskCluster) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedMSK: mskOption,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkKafka: {
                        ...prev.ingestionServer.sinkKafka,
                        securityGroupId: mskCluster?.securityGroupId || '',
                        mskCluster: {
                          name: mskCluster?.name || '',
                          arn: mskCluster?.arn || '',
                        },
                      },
                    },
                  };
                });
              }}
              changeSecurityGroup={(sg) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedSelfHostedMSKSG: sg,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkKafka: {
                        ...prev.ingestionServer.sinkKafka,
                        securityGroupId: sg.value || '',
                      },
                    },
                  };
                });
              }}
              changeMSKTopic={(topic) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkKafka: {
                        ...prev.ingestionServer.sinkKafka,
                        topic: topic,
                      },
                    },
                  };
                });
              }}
              changeEnableKafkaConnector={(enable) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkKafka: {
                        ...prev.ingestionServer.sinkKafka,
                        kafkaConnector: {
                          enable: enable,
                        },
                      },
                    },
                  };
                });
              }}
              changeSelfHosted={(selfHost) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    kafkaSelfHost: selfHost,
                  };
                });
              }}
              changeKafkaBrokers={(brokers) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    kafkaBrokers: brokers,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkKafka: {
                        ...prev.ingestionServer.sinkKafka,
                        brokers: brokers.split(','),
                      },
                    },
                  };
                });
              }}
              changeKafkaTopic={(topic) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkKafka: {
                        ...prev.ingestionServer.sinkKafka,
                        topic: topic,
                      },
                    },
                  };
                });
              }}
              changeKDSProvisionType={(type) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    seledtedKDKProvisionType: type,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkKinesis: {
                        ...prev.ingestionServer.sinkKinesis,
                        kinesisStreamMode: type.value || '',
                      },
                    },
                  };
                });
              }}
              changeKDSShardNumber={(num) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkKinesis: {
                        ...prev.ingestionServer.sinkKinesis,
                        kinesisShardCount: parseInt(num),
                      },
                    },
                  };
                });
              }}
            />
          ),
        },
        {
          title: t('pipeline:create.dataProcessor'),
          isOptional: true,
          content: (
            <DataProcessing
              update={update}
              pipelineInfo={pipelineInfo}
              dataProcessorIntervalInvalidError={
                dataProcessorIntervalInvalidError
              }
              changeEnableDataProcessing={(enable) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    enableDataProcessing: enable,
                  };
                });
              }}
              changeExecutionType={(type) => {
                setDataProcessorIntervalInvalidError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedExcutionType: type,
                  };
                });
              }}
              changeExecutionCronExp={(cron) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    exeCronExp: cron,
                  };
                });
              }}
              changeExecutionFixedValue={(value) => {
                setDataProcessorIntervalInvalidError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    excutionFixedValue: value,
                  };
                });
              }}
              changeExecutionFixedUnit={(unit) => {
                setDataProcessorIntervalInvalidError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedExcutionUnit: unit,
                  };
                });
              }}
              changeEventFreshValue={(value) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    eventFreshValue: value,
                  };
                });
              }}
              changeEventFreshUnit={(unit) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedEventFreshUnit: unit,
                  };
                });
              }}
              changeEnrichPlugins={(plugins) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedEnrichPlugins: plugins,
                  };
                });
              }}
              changeTransformPlugins={(plugins) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedTransformPlugins: plugins,
                  };
                });
              }}
              changeEnableRedshift={(enable) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    enableRedshift: enable,
                  };
                });
              }}
              changeSelectedRedshift={(cluster) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedRedshiftCluster: cluster,
                    arnAccountId: extractAccountIdFromArn(
                      cluster.description || ''
                    ),
                    dataAnalytics: {
                      ...prev.dataAnalytics,
                      redshift: {
                        ...prev.dataAnalytics.redshift,
                        provisioned: {
                          ...prev.dataAnalytics.redshift.provisioned,
                          clusterIdentifier: cluster.value || '',
                        },
                      },
                    },
                  };
                });
              }}
              changeSelectedRedshiftRole={(role) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedRedshiftRole: role,
                  };
                });
              }}
              changeRedshiftExecutionUnit={(unit) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedRedshiftExecutionUnit: unit,
                  };
                });
              }}
              changeRedshiftExecutionDuration={(duration) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftExecutionValue: duration,
                  };
                });
              }}
              changeEnableAthena={(enable) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    enableAthena: enable,
                    dataAnalytics: {
                      ...prev.dataAnalytics,
                      athena: enable,
                    },
                  };
                });
              }}
              changeRedshiftType={(type) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftType: type,
                  };
                });
              }}
              changeDBUser={(user) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    dataAnalytics: {
                      ...prev.dataAnalytics,
                      redshift: {
                        ...prev.dataAnalytics.redshift,
                        provisioned: {
                          ...prev.dataAnalytics.redshift.provisioned,
                          dbUser: user,
                        },
                      },
                    },
                  };
                });
              }}
              changeBaseCapacity={(capacity) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftBaseCapacity: capacity,
                    dataAnalytics: {
                      ...prev.dataAnalytics,
                      redshift: {
                        ...prev.dataAnalytics.redshift,
                        newServerless: {
                          ...prev.dataAnalytics.redshift.newServerless,
                          baseCapacity: parseInt(capacity.value || '16'),
                        },
                      },
                    },
                  };
                });
              }}
              changeServerlessRedshiftVPC={(vpc) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftServerlessVPC: vpc,
                    dataAnalytics: {
                      ...prev.dataAnalytics,
                      redshift: {
                        ...prev.dataAnalytics.redshift,
                        newServerless: {
                          ...prev.dataAnalytics.redshift.newServerless,
                          network: {
                            ...prev.dataAnalytics.redshift.newServerless
                              .network,
                            vpcId: vpc.value || '',
                          },
                        },
                      },
                    },
                  };
                });
              }}
              changeSecurityGroup={(sg) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftServerlessSG: sg,
                    dataAnalytics: {
                      ...prev.dataAnalytics,
                      redshift: {
                        ...prev.dataAnalytics.redshift,
                        newServerless: {
                          ...prev.dataAnalytics.redshift.newServerless,
                          network: {
                            ...prev.dataAnalytics.redshift.newServerless
                              .network,
                            securityGroups: sg.map(
                              (element) => element.value || ''
                            ),
                          },
                        },
                      },
                    },
                  };
                });
              }}
              changeReshiftSubnets={(subnets) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftServerlessSubnets: subnets,
                    dataAnalytics: {
                      ...prev.dataAnalytics,
                      redshift: {
                        ...prev.dataAnalytics.redshift,
                        newServerless: {
                          ...prev.dataAnalytics.redshift.newServerless,
                          network: {
                            ...prev.dataAnalytics.redshift.newServerless
                              .network,
                            subnetIds: subnets.map(
                              (element) => element.value || ''
                            ),
                          },
                        },
                      },
                    },
                  };
                });
              }}
              changeDataLoadType={(type) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedDataLoadType: type,
                  };
                });
              }}
              changeDataLoadValue={(value) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftDataLoadValue: value,
                  };
                });
              }}
              changeDataLoadUnit={(unit) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftDataLoadUnit: unit,
                  };
                });
              }}
              changeDataLoadCronExp={(cron) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    dataLoadCronExp: cron,
                  };
                });
              }}
              changeUpsertUserValue={(value) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftUpsertFreqValue: value,
                  };
                });
              }}
              changeUpsertUserUnit={(unit) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftUpsertFreqUnit: unit,
                  };
                });
              }}
              changeSelectedUpsertType={(type) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedUpsertType: type,
                  };
                });
              }}
              changeUpsertCronExp={(cron) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    upsertCronExp: cron,
                  };
                });
              }}
            />
          ),
        },
        {
          title: t('pipeline:create.reporting'),
          isOptional: true,
          content: (
            <Reporting
              update={update}
              pipelineInfo={pipelineInfo}
              changeEnableReporting={(enable) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    enableReporting: enable,
                  };
                });
              }}
              changeQuickSightSelectedUser={(user) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedQuickSightUser: user,
                    report: {
                      ...prev.report,
                      quickSight: {
                        ...prev.report.quickSight,
                        user: user.value || '',
                      },
                    },
                  };
                });
              }}
              changeQuickSightAccountName={(name) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    report: {
                      ...prev.report,
                      quickSight: {
                        ...prev.report?.quickSight,
                        accountName: name,
                      },
                    },
                  };
                });
              }}
            />
          ),
        },
        {
          title: t('pipeline:create.reviewLaunch'),
          content: <ReviewAndLaunch pipelineInfo={pipelineInfo} />,
        },
      ]}
    />
  );
};

interface CreatePipelineProps {
  update?: boolean;
}

const CreatePipeline: React.FC<CreatePipelineProps> = (
  props: CreatePipelineProps
) => {
  const { t } = useTranslation();
  const { update } = props;
  const { id, pid } = useParams();

  const [loadingData, setLoadingData] = useState(false);
  const [updatePipeline, setUpdatePipeline] = useState<IExtPipeline>();

  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: update
        ? t('breadCrumb.updatePipeline')
        : t('breadCrumb.createPipeline'),
      href: '/',
    },
  ];
  const setUpdateRegion = async (pipelineInfo: IExtPipeline) => {
    pipelineInfo.selectedRegion = {
      label: AWS_REGION_MAP[pipelineInfo.region]?.RegionName
        ? t(AWS_REGION_MAP[pipelineInfo.region].RegionName) || ''
        : '-',
      labelTag: pipelineInfo.region,
      value: pipelineInfo.region,
    };
  };
  const setUpdateVpc = async (pipelineInfo: IExtPipeline) => {
    try {
      const { success, data }: ApiResponse<VPCResponse[]> = await getVPCList({
        region: pipelineInfo.region,
      });
      if (success) {
        const selectVpc = data.filter(
          (element) => element.id === pipelineInfo.network.vpcId
        )[0];
        pipelineInfo.selectedVPC = {
          label: `${selectVpc.name}(${selectVpc.id})`,
          value: selectVpc.id,
          description: selectVpc.cidr,
        };
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateSDK = async (pipelineInfo: IExtPipeline) => {
    pipelineInfo.selectedSDK = SDK_LIST.filter(
      (sdk) => sdk.value === pipelineInfo.dataCollectionSDK
    )[0];
  };
  const setUpdateSubnetList = async (pipelineInfo: IExtPipeline) => {
    try {
      const { success, data }: ApiResponse<SubnetResponse[]> =
        await getSubnetList({
          region: pipelineInfo.region,
          vpcId: pipelineInfo.network.vpcId,
        });
      if (success) {
        const publicSubnets = data.filter((element) =>
          pipelineInfo.network.publicSubnetIds.includes(element.id)
        );
        const privateSubnets = data.filter((element) =>
          pipelineInfo.network.privateSubnetIds.includes(element.id)
        );
        pipelineInfo.selectedPublicSubnet = publicSubnets.map((element) => ({
          label: `${element.name}(${element.id})`,
          value: element.id,
          description: `${element.availabilityZone}:${element.cidr}`,
        }));
        pipelineInfo.selectedPrivateSubnet = privateSubnets.map((element) => ({
          label: `${element.name}(${element.id})`,
          value: element.id,
          description: `${element.availabilityZone}:${element.cidr}`,
        }));
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateCetificate = async (pipelineInfo: IExtPipeline) => {
    try {
      if (!pipelineInfo.ingestionServer.domain.certificateArn) {
        return;
      }
      const { success, data }: ApiResponse<CetificateResponse[]> =
        await getCertificates({ region: pipelineInfo.region });
      if (success) {
        const selectCert = data.filter(
          (element) =>
            element.arn === pipelineInfo.ingestionServer.domain.certificateArn
        )[0];
        pipelineInfo.selectedCertificate = {
          label: selectCert.domain,
          value: selectCert.arn,
        };
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateSSMSecret = async (pipelineInfo: IExtPipeline) => {
    try {
      const enableAuthentication =
        pipelineInfo.ingestionServer.loadBalancer.authenticationSecretArn !==
          null &&
        pipelineInfo.ingestionServer.loadBalancer.authenticationSecretArn !==
          '';
      pipelineInfo.enableAuthentication = enableAuthentication;
      if (!enableAuthentication) {
        return;
      }
      const { success, data }: ApiResponse<SSMSecretRepoose[]> =
        await getSSMSecrets({ region: pipelineInfo.region });
      if (success) {
        const selectSecret = data.filter(
          (element) =>
            element.arn ===
            pipelineInfo.ingestionServer.loadBalancer.authenticationSecretArn
        )[0];
        pipelineInfo.selectedSecret = {
          label: selectSecret.name,
          value: selectSecret.arn,
        };
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateMSKCluster = async (pipelineInfo: IExtPipeline) => {
    try {
      if (
        pipelineInfo.ingestionServer.sinkType !== 'kafka' ||
        pipelineInfo.ingestionServer.sinkKafka.mskCluster.arn === null
      ) {
        return;
      }
      pipelineInfo.mskCreateMethod = ResourceCreateMehod.EXSITING;
      const { success, data }: ApiResponse<MSKResponse[]> = await getMSKList({
        vpcId: pipelineInfo.network.vpcId,
        region: pipelineInfo.region,
      });
      if (success) {
        const selectMsk = data.filter(
          (element) =>
            element.arn ===
            pipelineInfo.ingestionServer.sinkKafka.mskCluster.arn
        )[0];
        pipelineInfo.selectedMSK = {
          label: selectMsk.name,
          value: selectMsk.arn,
          description: `Authentication: ${selectMsk.authentication.join(',')}`,
          labelTag: selectMsk.type,
          iconAlt: selectMsk.arn,
        };
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateKafkaSelfHosted = async (pipelineInfo: IExtPipeline) => {
    try {
      if (
        pipelineInfo.ingestionServer.sinkType !== 'kafka' ||
        pipelineInfo.ingestionServer.sinkKafka.mskCluster.arn !== null
      ) {
        return;
      }
      pipelineInfo.mskCreateMethod = ResourceCreateMehod.CREATE;
      pipelineInfo.kafkaBrokers =
        pipelineInfo.ingestionServer.sinkKafka.brokers.join(',');
      const { success, data }: ApiResponse<SecurityGroupResponse[]> =
        await getSecurityGroups({
          region: pipelineInfo.region,
          vpcId: pipelineInfo.network.vpcId,
        });
      if (success) {
        const selectSG = data.filter(
          (element) =>
            element.id ===
            pipelineInfo.ingestionServer.sinkKafka.securityGroupId
        )[0];
        pipelineInfo.selectedSelfHostedMSKSG = {
          label: `${selectSG.name}(${selectSG.id})`,
          value: selectSG.id,
          description: selectSG.description,
        };
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateKDSType = async (pipelineInfo: IExtPipeline) => {
    if (pipelineInfo.ingestionServer.sinkType !== 'kinesis') {
      return;
    }
    pipelineInfo.seledtedKDKProvisionType = KDS_TYPE.filter(
      (kds) =>
        kds.value === pipelineInfo.ingestionServer.sinkKinesis.kinesisStreamMode
    )[0];
  };
  const setUpdateListPlugins = async (pipelineInfo: IExtPipeline) => {
    try {
      const { success, data }: ApiResponse<ResponseTableData<IPlugin>> =
        await getPluginList({
          pageNumber: 1,
          pageSize: 1000,
        });
      if (success) {
        pipelineInfo.selectedTransformPlugins = data.items.filter(
          (item) => item.id === pipelineInfo.etl.transformPlugin
        );
        pipelineInfo.selectedEnrichPlugins = data.items.filter((item) =>
          pipelineInfo.etl.enrichPlugin.includes(item.id || '')
        );
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateNewServerlessVpc = async (pipelineInfo: IExtPipeline) => {
    try {
      const { success, data }: ApiResponse<VPCResponse[]> = await get3AZVPCList(
        {
          region: pipelineInfo.region,
        }
      );
      if (success) {
        const selectVpc = data.filter(
          (element) =>
            element.id ===
            pipelineInfo.dataAnalytics.redshift.newServerless.network.vpcId
        )[0];
        pipelineInfo.redshiftServerlessVPC = {
          label: `${selectVpc.name}(${selectVpc.id})`,
          value: selectVpc.id,
          description: selectVpc.cidr,
        };
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateNewServerlessSG = async (pipelineInfo: IExtPipeline) => {
    try {
      const { success, data }: ApiResponse<SecurityGroupResponse[]> =
        await getSecurityGroups({
          region: pipelineInfo.region,
          vpcId:
            pipelineInfo.dataAnalytics.redshift.newServerless.network.vpcId,
        });
      if (success) {
        const selectSGs = data.filter((element) =>
          pipelineInfo.dataAnalytics.redshift.newServerless.network.securityGroups.includes(
            element.id
          )
        );
        pipelineInfo.redshiftServerlessSG = selectSGs.map((element) => ({
          label: `${element.name}(${element.id})`,
          value: element.id,
          description: element.description,
        }));
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateNewServerlessSubnets = async (pipelineInfo: IExtPipeline) => {
    try {
      const { success, data }: ApiResponse<SubnetResponse[]> =
        await getSubnetList({
          region: pipelineInfo.region,
          vpcId:
            pipelineInfo.dataAnalytics.redshift.newServerless.network.vpcId,
        });
      if (success) {
        const selectSubnets = data.filter((element) =>
          pipelineInfo.dataAnalytics.redshift.newServerless.network.subnetIds.includes(
            element.id
          )
        );
        pipelineInfo.redshiftServerlessSubnets = selectSubnets.map(
          (element) => ({
            label: `${element.name}(${element.id})`,
            value: element.id,
            description: `${element.availabilityZone}:${element.cidr}(${element.type})`,
          })
        );
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateProvisionedRedshiftCluster = async (
    pipelineInfo: IExtPipeline
  ) => {
    try {
      const { success, data }: ApiResponse<RedshiftResponse[]> =
        await getRedshiftCluster({
          region: pipelineInfo.region,
          vpcId: pipelineInfo.network.vpcId,
        });
      if (success) {
        const selectCluster = data.filter(
          (element) =>
            element.name ===
            pipelineInfo.dataAnalytics.redshift.provisioned.clusterIdentifier
        )[0];
        pipelineInfo.selectedRedshiftCluster = {
          label: selectCluster.name,
          value: selectCluster.name,
          description: selectCluster.endpoint.Address,
          labelTag: selectCluster.status,
        };
      }
    } catch (error) {
      console.error(error);
    }
  };

  const setUpdateETL = async (pipelineInfo: IExtPipeline) => {
    if (!pipelineInfo.enableDataProcessing) {
      return;
    }
    const reverseScheduleExpression = reverseCronDateRange(
      pipelineInfo.etl.scheduleExpression
    );
    pipelineInfo.selectedExcutionType = EXECUTION_TYPE_LIST.filter(
      (type) => type.value === reverseScheduleExpression.type
    )[0];
    if (reverseScheduleExpression.type === ExecutionType.FIXED_RATE) {
      pipelineInfo.excutionFixedValue = reverseScheduleExpression.value;
      pipelineInfo.selectedExcutionUnit = EXCUTION_UNIT_LIST.filter(
        (type) => type.value === reverseScheduleExpression.unit
      )[0];
    } else {
      pipelineInfo.exeCronExp = reverseScheduleExpression.value;
    }

    const reverseFreshness = reverseFreshnessInHour(
      pipelineInfo.etl.dataFreshnessInHour
    );
    pipelineInfo.eventFreshValue = reverseFreshness.value;
    pipelineInfo.selectedEventFreshUnit = {
      label: reverseFreshness.unit === 'hour' ? 'Hours' : 'Days',
      value: reverseFreshness.unit,
    };
    setUpdateListPlugins(pipelineInfo);

    pipelineInfo.enableRedshift = pipelineInfo.dataAnalytics.redshift !== null;
    pipelineInfo.enableAthena = pipelineInfo.dataAnalytics.athena !== null;

    pipelineInfo.redshiftType =
      pipelineInfo.dataAnalytics.redshift.newServerless !== null
        ? 'serverless'
        : 'provisioned';
    if (pipelineInfo.redshiftType === 'serverless') {
      pipelineInfo.redshiftBaseCapacity = REDSHIFT_CAPACITY_LIST.filter(
        (type) =>
          type.value ===
          pipelineInfo.dataAnalytics.redshift.newServerless.baseCapacity.toString()
      )[0];
      setUpdateNewServerlessVpc(pipelineInfo);
      setUpdateNewServerlessSG(pipelineInfo);
      setUpdateNewServerlessSubnets(pipelineInfo);
    } else if (pipelineInfo.redshiftType === 'provisioned') {
      setUpdateProvisionedRedshiftCluster(pipelineInfo);
    }

    const reverseRedshiftDataRange = reverseRedshiftInterval(
      pipelineInfo.dataAnalytics.redshift.dataRange
    );
    pipelineInfo.redshiftExecutionValue = reverseRedshiftDataRange.value;
    pipelineInfo.selectedRedshiftExecutionUnit = REDSHIFT_UNIT_LIST.filter(
      (type) => type.value === reverseRedshiftDataRange.unit
    )[0];

    const reverseLoadJobScheduleExpression = reverseCronDateRange(
      pipelineInfo.dataAnalytics.loadWorkflow.loadJobScheduleIntervalExpression
    );
    pipelineInfo.selectedDataLoadType = EXECUTION_TYPE_LIST.filter(
      (type) => type.value === reverseLoadJobScheduleExpression.type
    )[0];
    if (reverseLoadJobScheduleExpression.type === ExecutionType.FIXED_RATE) {
      pipelineInfo.redshiftDataLoadValue =
        reverseLoadJobScheduleExpression.value;
      pipelineInfo.redshiftDataLoadUnit = EXCUTION_UNIT_LIST.filter(
        (type) => type.value === reverseLoadJobScheduleExpression.unit
      )[0];
    } else {
      pipelineInfo.dataLoadCronExp = reverseLoadJobScheduleExpression.value;
    }

    const reverseUpsertUsersScheduleExpression = reverseCronDateRange(
      pipelineInfo.dataAnalytics.upsertUsers.scheduleExpression
    );
    pipelineInfo.selectedUpsertType = EXECUTION_TYPE_LIST.filter(
      (type) => type.value === reverseUpsertUsersScheduleExpression.type
    )[0];
    if (
      reverseUpsertUsersScheduleExpression.type === ExecutionType.FIXED_RATE
    ) {
      pipelineInfo.redshiftUpsertFreqValue =
        reverseUpsertUsersScheduleExpression.value;
      pipelineInfo.redshiftUpsertFreqUnit = EXCUTION_UNIT_LIST.filter(
        (type) => type.value === reverseUpsertUsersScheduleExpression.unit
      )[0];
    } else {
      pipelineInfo.upsertCronExp = reverseUpsertUsersScheduleExpression.value;
    }
  };

  const setUpdateQuickSightUserList = async (pipelineInfo: IExtPipeline) => {
    try {
      const { success, data }: ApiResponse<QuickSightUserResponse[]> =
        await getQuickSightUsers();
      if (success) {
        const selectUser = data.filter(
          (element) => element.userName === pipelineInfo.report.quickSight.user
        )[0];
        pipelineInfo.selectedQuickSightUser = {
          label: selectUser.userName,
          value: selectUser.userName,
          description: selectUser.email,
          labelTag: selectUser.role,
        };
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateReport = async (pipelineInfo: IExtPipeline) => {
    if (!pipelineInfo.enableReporting) {
      return;
    }
    if (pipelineInfo.report.quickSight.user) {
      setUpdateQuickSightUserList(pipelineInfo);
    }
  };
  const getDefaultExtPipeline = (data: IExtPipeline): IExtPipeline => {
    const res: IExtPipeline = {
      ...INIT_EXT_PIPELINE_DATA,
      id: data.id ?? '',
      type: data.type ?? '',
      prefix: data.prefix ?? '',
      projectId: data.projectId ?? '',
      pipelineId: data.pipelineId ?? '',
      region: data.region ?? '',
      dataCollectionSDK: data.dataCollectionSDK ?? '',
      tags: data.tags ?? [],
      network: {
        vpcId: data.network.vpcId ?? '',
        publicSubnetIds: data.network.publicSubnetIds ?? [],
        privateSubnetIds: data.network.privateSubnetIds ?? [],
      },
      bucket: {
        name: data.bucket?.name ?? '',
        prefix: data.bucket?.prefix ?? '',
      },
      ingestionServer: {
        size: {
          serverMin: data.ingestionServer.size.serverMin ?? 2,
          serverMax: data.ingestionServer.size.serverMax ?? 4,
          warmPoolSize: data.ingestionServer.size.warmPoolSize ?? 1,
          scaleOnCpuUtilizationPercent:
            data.ingestionServer.size.scaleOnCpuUtilizationPercent ?? 50,
        },
        domain: {
          domainName: data.ingestionServer.domain.domainName ?? '',
          certificateArn: data.ingestionServer.domain.certificateArn ?? '',
        },
        loadBalancer: {
          serverEndpointPath:
            data.ingestionServer.loadBalancer.serverEndpointPath ?? '/collect',
          serverCorsOrigin:
            data.ingestionServer.loadBalancer.serverCorsOrigin ?? '',
          protocol:
            data.ingestionServer.loadBalancer.protocol ?? ProtocalType.HTTPS,
          enableGlobalAccelerator:
            data.ingestionServer.loadBalancer.enableGlobalAccelerator ?? false,
          enableApplicationLoadBalancerAccessLog:
            data.ingestionServer.loadBalancer
              .enableApplicationLoadBalancerAccessLog ?? false,
          authenticationSecretArn:
            data.ingestionServer.loadBalancer.authenticationSecretArn ?? '',
          logS3Bucket: {
            name: data.ingestionServer.loadBalancer.logS3Bucket.name ?? '',
            prefix: data.ingestionServer.loadBalancer.logS3Bucket.prefix ?? '',
          },
          notificationsTopicArn:
            data.ingestionServer.loadBalancer.notificationsTopicArn ?? '',
        },
        sinkType: data.ingestionServer.sinkType ?? SinkType.MSK,
        sinkBatch: {
          size: data.ingestionServer.sinkBatch?.size ?? 50000,
          intervalSeconds:
            data.ingestionServer.sinkBatch?.intervalSeconds ?? 3000,
        },
        sinkS3: {
          sinkBucket: {
            name: data.ingestionServer.sinkS3?.sinkBucket.name ?? '',
            prefix: data.ingestionServer.sinkS3?.sinkBucket.prefix ?? '',
          },
          s3BufferSize: data.ingestionServer.sinkS3?.s3BufferSize ?? 10,
          s3BufferInterval:
            data.ingestionServer.sinkS3?.s3BufferInterval ?? 300,
        },
        sinkKafka: {
          brokers: data.ingestionServer.sinkKafka?.brokers ?? [],
          topic: data.ingestionServer.sinkKafka?.topic ?? '',
          securityGroupId:
            data.ingestionServer.sinkKafka?.securityGroupId ?? '',
          mskCluster: {
            name: data.ingestionServer.sinkKafka?.mskCluster.name ?? '',
            arn: data.ingestionServer.sinkKafka?.mskCluster.arn ?? '',
          },
          kafkaConnector: {
            enable:
              data.ingestionServer.sinkKafka?.kafkaConnector.enable ?? true,
          },
        },
        sinkKinesis: {
          kinesisStreamMode:
            data.ingestionServer.sinkKinesis?.kinesisStreamMode ?? '',
          kinesisShardCount:
            data.ingestionServer.sinkKinesis?.kinesisShardCount ?? 2,
          sinkBucket: {
            name: data.ingestionServer.sinkKinesis?.sinkBucket.name ?? '',
            prefix: data.ingestionServer.sinkKinesis?.sinkBucket.prefix ?? '',
          },
        },
      },
      etl: {
        dataFreshnessInHour: data.etl.dataFreshnessInHour ?? 72,
        scheduleExpression: data.etl.scheduleExpression ?? '',
        sourceS3Bucket: {
          name: data.etl.sourceS3Bucket.name ?? '',
          prefix: data.etl.sourceS3Bucket.prefix ?? '',
        },
        sinkS3Bucket: {
          name: data.etl.sinkS3Bucket.name ?? '',
          prefix: data.etl.sinkS3Bucket.prefix ?? '',
        },
        pipelineBucket: {
          name: data.etl.pipelineBucket.name ?? '',
          prefix: data.etl.pipelineBucket.prefix ?? '',
        },
        transformPlugin: data.etl.transformPlugin ?? '',
        enrichPlugin: data.etl.enrichPlugin ?? [],
      },
      dataAnalytics: {
        athena: data.dataAnalytics.athena ?? false,
        redshift: {
          dataRange: data.dataAnalytics.redshift.dataRange ?? 0,
          provisioned: {
            clusterIdentifier:
              data.dataAnalytics.redshift.provisioned?.clusterIdentifier ?? '',
            dbUser: data.dataAnalytics.redshift.provisioned?.dbUser ?? '',
          },
          newServerless: {
            network: {
              vpcId:
                data.dataAnalytics.redshift.newServerless.network.vpcId ?? '',
              subnetIds:
                data.dataAnalytics.redshift.newServerless.network.subnetIds ??
                [],
              securityGroups:
                data.dataAnalytics.redshift.newServerless.network
                  .securityGroups ?? [],
            },
            baseCapacity:
              data.dataAnalytics.redshift.newServerless.baseCapacity ?? 16,
          },
        },
        loadWorkflow: {
          loadJobScheduleIntervalExpression:
            data.dataAnalytics.loadWorkflow.loadJobScheduleIntervalExpression ??
            '',
        },
        upsertUsers: {
          scheduleExpression:
            data.dataAnalytics.upsertUsers.scheduleExpression ?? '',
        },
      },
      status: {
        status: data.status?.status ?? '',
        stackDetails: data.status?.stackDetails ?? [],
      },
      workflow: data.workflow,
      executionName: data.executionName,
      executionArn: data.executionArn,
      version: data.version ?? '',
      versionTag: data.versionTag ?? '',
      createAt: data.createAt ?? 0,
      updateAt: data.updateAt ?? 0,
      operator: data.operator ?? '',
      deleted: data.deleted ?? false,
    };
    res.enableDataProcessing = !isEmpty(data.etl);
    res.enableReporting = !isEmpty(data.report);
    if (res.enableReporting) {
      res.report = data.report;
    }
    return res;
  };
  const getProjectPipelineDetail = async () => {
    if (update) {
      try {
        setLoadingData(true);
        const { success, data }: ApiResponse<IExtPipeline> =
          await getPipelineDetail({
            id: id ?? '',
            pid: pid ?? '',
            cache: true,
          });
        if (success) {
          const extPipeline = getDefaultExtPipeline(data);
          setUpdateRegion(extPipeline);
          setUpdateVpc(extPipeline);
          setUpdateSDK(extPipeline);
          setUpdateSubnetList(extPipeline);
          setUpdateCetificate(extPipeline);
          setUpdateSSMSecret(extPipeline);
          setUpdateMSKCluster(extPipeline);
          setUpdateKafkaSelfHosted(extPipeline);
          setUpdateKDSType(extPipeline);
          setUpdateETL(extPipeline);
          setUpdateReport(extPipeline);
          setUpdatePipeline(extPipeline);

          setLoadingData(false);
        }
      } catch (error) {
        setLoadingData(false);
      }
    }
  };

  useEffect(() => {
    getProjectPipelineDetail();
  }, []);

  return (
    <AppLayout
      toolsHide
      content={
        loadingData ? (
          <Loading />
        ) : (
          <Content update={update} updatePipeline={updatePipeline} />
        )
      }
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/pipelines" />}
    />
  );
};

export default CreatePipeline;
