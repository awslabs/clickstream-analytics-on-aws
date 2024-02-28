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
  CORS_PATTERN,
  DOMAIN_NAME_PATTERN,
  KAFKA_BROKERS_PATTERN,
  KAFKA_TOPIC_PATTERN,
  REDSHIFT_DB_USER_NAME_PATTERN,
} from '@aws/clickstream-base-lib';
import { AppLayout, SelectProps, Wizard } from '@cloudscape-design/components';
import {
  createProjectPipeline,
  getPipelineDetail,
  updateProjectPipeline,
} from 'apis/pipeline';
import { getPluginList } from 'apis/plugin';
import {
  checkServicesAvailable,
  getCertificates,
  getMSKList,
  getQuickSightUsers,
  getRedshiftCluster,
  getS3BucketList,
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
  DEFAULT_TRANSFORM_SDK_IDS,
  EIngestionType,
  ENetworkType,
  EXCUTION_UNIT_LIST,
  EXECUTION_TYPE_LIST,
  ExecutionType,
  KDSProvisionType,
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
  REDSHIFT_UNIT_LIST,
  ResourceCreateMethod,
  SDK_LIST,
  SinkType,
} from 'ts/const';
import { INIT_EXT_PIPELINE_DATA } from 'ts/init';
import {
  checkStringValidRegex,
  defaultGenericsValue,
  defaultStr,
  extractAccountIdFromArn,
  generateCronDateRange,
  generateRedshiftInterval,
  generateRedshiftRPUOptionListByRegion,
  isEmpty,
  isPositiveInteger,
  reverseCronDateRange,
  reverseFreshnessInHour,
  reverseRedshiftInterval,
  ternary,
  validatePublicSubnetInSameAZWithPrivateSubnets,
  validateSubnetCrossInAZs,
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
  const [loadingQuickSight, setloadingQuickSight] = useState(false);

  const [regionEmptyError, setRegionEmptyError] = useState(false);
  const [vpcEmptyError, setVPCEmptyError] = useState(false);
  const [sdkEmptyError, setSDKEmptyError] = useState(false);
  const [tagsKeyValueEmptyError, setTagsKeyValueEmptyError] = useState(false);
  const [assetsBucketEmptyError, setAssetsBucketEmptyError] = useState(false);

  const [publicSubnetError, setPublicSubnetError] = useState(false);
  const [privateSubnetError, setPrivateSubnetError] = useState(false);
  const [
    privateSubnetDiffWithPublicError,
    setPrivateSubnetDiffWithPublicError,
  ] = useState(false);

  const [minCapacityError, setMinCapacityError] = useState(false);
  const [maxCapacityError, setMaxCapacityError] = useState(false);
  const [warmPoolError, setWarmPoolError] = useState(false);

  const [domainNameEmptyError, setDomainNameEmptyError] = useState(false);
  const [domainNameFormatError, setDomainNameFormatError] = useState(false);
  const [certificateEmptyError, setCertificateEmptyError] = useState(false);

  const [corsFormatError, setCorsFormatError] = useState(false);
  const [secretEmptyError, setSecretEmptyError] = useState(false);

  const [sinkBatchSizeError, setSinkBatchSizeError] = useState(false);
  const [sinkIntervalError, setSinkIntervalError] = useState(false);

  const [loadingServiceAvailable, setLoadingServiceAvailable] = useState(false);

  const [mskEmptyError, setMskEmptyError] = useState(false);
  const [topicFormatError, setTopicFormatError] = useState(false);
  const [brokerLinkEmptyError, setBrokerLinkEmptyError] = useState(false);
  const [brokerLinkFormatError, setBrokerLinkFormatError] = useState(false);
  const [kafkaSGEmptyError, setKafkaSGEmptyError] = useState(false);

  const [bufferS3SizeFormatError, setBufferS3SizeFormatError] = useState(false);
  const [bufferS3IntervalFormatError, setBufferS3IntervalFormatError] =
    useState(false);

  const [bufferKDSModeEmptyError, setBufferKDSModeEmptyError] = useState(false);
  const [bufferKDSShardNumFormatError, setBufferKDSShardNumFormatError] =
    useState(false);

  const [redshiftServerlessVpcEmptyError, setRedshiftServerlessVpcEmptyError] =
    useState(false);
  const [redshiftServerlessSGEmptyError, setRedshiftServerlessSGEmptyError] =
    useState(false);
  const [
    redshiftServerlessSubnetEmptyError,
    setRedshiftServerlessSubnetEmptyError,
  ] = useState(false);
  const [
    redshiftServerlessSubnetInvalidError,
    setRedshiftServerlessSubnetInvalidError,
  ] = useState(false);

  const [
    redshiftProvisionedClusterEmptyError,
    setRedshiftProvisionedClusterEmptyError,
  ] = useState(false);
  const [
    redshiftProvisionedDBUserEmptyError,
    setRedshiftProvisionedDBUserEmptyError,
  ] = useState(false);
  const [
    redshiftProvisionedDBUserFormatError,
    setRedshiftProvisionedDBUserFormatError,
  ] = useState(false);

  const [
    dataProcessorIntervalInvalidError,
    setDataProcessorIntervalInvalidError,
  ] = useState(false);

  const [acknowledgedHTTPSecurity, setAcknowledgedHTTPSecurity] =
    useState(true);

  const [transformPluginEmptyError, setTransformPluginEmptyError] =
    useState(false);

  const [unSupportedServices, setUnSupportedServices] = useState('');
  const [quickSightDisabled, setQuickSightDisabled] = useState(false);
  const [quickSightUserEmptyError, setQuickSightUserEmptyError] =
    useState(false);

  const [pipelineInfo, setPipelineInfo] = useState<IExtPipeline>(
    updatePipeline
      ? updatePipeline
      : {
          ...INIT_EXT_PIPELINE_DATA,
          projectId: defaultStr(projectId),
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
    if (
      pipelineInfo.tags.some(
        (tag) =>
          !tag.key ||
          tag.key.trim() === '' ||
          !tag.value ||
          tag.value.trim() === ''
      )
    ) {
      setTagsKeyValueEmptyError(true);
      return false;
    }
    return true;
  };

  const validateIngestionSubnets = () => {
    // Validate public subnets
    if (
      pipelineInfo.network.type !== ENetworkType.Private &&
      (pipelineInfo.selectedPublicSubnet.length < 2 ||
        !validateSubnetCrossInAZs(pipelineInfo.selectedPublicSubnet, 2))
    ) {
      setPublicSubnetError(true);
      return false;
    }

    // Validate private subnets
    if (
      pipelineInfo.selectedPrivateSubnet.length < 2 ||
      !validateSubnetCrossInAZs(pipelineInfo.selectedPrivateSubnet, 2)
    ) {
      setPrivateSubnetError(true);
      return false;
    }

    // Validate private subnet in the same AZ with public subnets
    if (
      pipelineInfo.network.type !== ENetworkType.Private &&
      !validatePublicSubnetInSameAZWithPrivateSubnets(
        pipelineInfo.selectedPublicSubnet,
        pipelineInfo.selectedPrivateSubnet
      )
    ) {
      setPrivateSubnetDiffWithPublicError(true);
      return false;
    }
    return true;
  };

  const validIngestionCapacity = () => {
    // Validate ingestion server min capacity
    if (!isPositiveInteger(pipelineInfo.ingestionServer.size.serverMin)) {
      setMinCapacityError(true);
      return false;
    }

    // Validate ingestion server max capacity
    if (
      !isPositiveInteger(pipelineInfo.ingestionServer.size.serverMax) ||
      pipelineInfo.ingestionServer.size.serverMax <
        pipelineInfo.ingestionServer.size.serverMin ||
      pipelineInfo.ingestionServer.size.serverMax === 1
    ) {
      setMaxCapacityError(true);
      return false;
    }

    // Validate ingestion server warmpool
    if (
      pipelineInfo.ingestionServer.size.warmPoolSize < 0 ||
      pipelineInfo.ingestionServer.size.serverMax <
        pipelineInfo.ingestionServer.size.warmPoolSize
    ) {
      setWarmPoolError(true);
      return false;
    }
    return true;
  };

  const validateIngestionSSL = () => {
    // Validate HTTPs with SSL Certificate
    if (
      pipelineInfo.ingestionServer.loadBalancer.protocol === ProtocalType.HTTPS
    ) {
      if (!pipelineInfo.ingestionServer.domain.domainName.trim()) {
        setDomainNameEmptyError(true);
        return false;
      }
      if (
        !checkStringValidRegex(
          pipelineInfo.ingestionServer.domain.domainName,
          new RegExp(DOMAIN_NAME_PATTERN)
        )
      ) {
        setDomainNameFormatError(true);
        return false;
      }
      if (!pipelineInfo.selectedCertificate) {
        setCertificateEmptyError(true);
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

    // check secret selected when enable authentication
    if (pipelineInfo.enableAuthentication) {
      if (!pipelineInfo.ingestionServer.loadBalancer.authenticationSecretArn) {
        setSecretEmptyError(true);
        return false;
      }
    }
    return true;
  };

  const validateIngestionSinkS3 = () => {
    if (pipelineInfo.ingestionServer.sinkType === SinkType.S3) {
      // check buffer size
      if (
        pipelineInfo.ingestionServer.sinkS3.s3BufferSize > 50 ||
        pipelineInfo.ingestionServer.sinkS3.s3BufferSize < 1
      ) {
        setBufferS3SizeFormatError(true);
        return false;
      }

      // check buffer interval
      if (
        pipelineInfo.ingestionServer.sinkS3.s3BufferInterval > 3600 ||
        pipelineInfo.ingestionServer.sinkS3.s3BufferInterval < 60
      ) {
        setBufferS3IntervalFormatError(true);
        return false;
      }
    }
    return true;
  };

  const validateIngestionSinkKDS = (
    sinkIntervalNum: number,
    sinkBatchSize: number
  ) => {
    if (pipelineInfo.ingestionServer.sinkType === SinkType.KDS) {
      // check provisioned mode
      if (!pipelineInfo.seledtedKDKProvisionType?.value) {
        setBufferKDSModeEmptyError(true);
        return false;
      }
      // check Shard number when provision mode is provisioned
      if (
        pipelineInfo.seledtedKDKProvisionType.value ===
        KDSProvisionType.PROVISIONED
      ) {
        if (
          pipelineInfo.ingestionServer.sinkKinesis.kinesisShardCount > 10000 ||
          pipelineInfo.ingestionServer.sinkKinesis.kinesisShardCount < 1
        ) {
          setBufferKDSShardNumFormatError(true);
          return false;
        }
      }
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
    return true;
  };

  const validIngestionMSKKafka = () => {
    if (!pipelineInfo.kafkaSelfHost) {
      if (!pipelineInfo.ingestionServer.sinkKafka.mskCluster.arn) {
        setMskEmptyError(true);
        return false;
      }
    }
    // check kafka when self hosted
    if (pipelineInfo.kafkaSelfHost) {
      // Check brokers
      if (!pipelineInfo.kafkaBrokers) {
        setBrokerLinkEmptyError(true);
        return false;
      }
      const brokerValidRes: boolean[] = [];
      pipelineInfo.kafkaBrokers.split(',')?.forEach((element) => {
        brokerValidRes.push(
          checkStringValidRegex(element, new RegExp(KAFKA_BROKERS_PATTERN))
        );
      });
      if (brokerValidRes.includes(false)) {
        setBrokerLinkFormatError(true);
        return false;
      }

      // Check security group
      if (!pipelineInfo.ingestionServer.sinkKafka.securityGroupId) {
        setKafkaSGEmptyError(true);
        return false;
      }
    }

    // check topic format if not empty
    if (pipelineInfo.ingestionServer.sinkKafka.topic) {
      if (
        !checkStringValidRegex(
          pipelineInfo.ingestionServer.sinkKafka.topic,
          new RegExp(KAFKA_TOPIC_PATTERN)
        )
      ) {
        setTopicFormatError(true);
        return false;
      }
    }
    return true;
  };

  const validateMSKBatchSize = (
    sinkIntervalNum: number,
    sinkBatchSize: number
  ) => {
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
    return true;
  };

  const validateIngestionServer = () => {
    // validate ingestion server subnets
    if (!validateIngestionSubnets()) {
      return false;
    }

    // validate ingestion server capacity
    if (!validIngestionCapacity()) {
      return false;
    }

    // validate ingestion server ssl
    if (!validateIngestionSSL()) {
      return false;
    }

    // validate ingestion sink s3
    if (!validateIngestionSinkS3()) {
      return false;
    }

    // check CORS domain when it's not empty
    if (pipelineInfo.ingestionServer.loadBalancer.serverCorsOrigin.trim()) {
      if (
        !checkStringValidRegex(
          pipelineInfo.ingestionServer.loadBalancer.serverCorsOrigin,
          new RegExp(CORS_PATTERN)
        )
      ) {
        setCorsFormatError(true);
        return false;
      }
    }

    const sinkIntervalNum =
      pipelineInfo.ingestionServer.sinkBatch?.intervalSeconds;
    const sinkBatchSize = pipelineInfo.ingestionServer.sinkBatch?.size;

    if (pipelineInfo.ingestionServer.sinkType === SinkType.MSK) {
      // check msk select when not self hosted
      if (!validIngestionMSKKafka()) {
        return false;
      }
      if (!validateMSKBatchSize(sinkIntervalNum, sinkBatchSize)) {
        return false;
      }
    }

    // validate ingestion sink kds
    if (!validateIngestionSinkKDS(sinkIntervalNum, sinkBatchSize)) {
      return false;
    }
    return true;
  };

  const checkDataProcessingInterval = (info: IExtPipeline) => {
    if (
      info.selectedExcutionType?.value === ExecutionType.FIXED_RATE &&
      parseInt(info.excutionFixedValue) < 6 &&
      info.selectedExcutionUnit?.value === 'minute'
    ) {
      setDataProcessorIntervalInvalidError(true);
      return false;
    }
    return true;
  };

  const checkTransformPluginEmpty = (info: IExtPipeline) => {
    if (
      !DEFAULT_TRANSFORM_SDK_IDS.includes(info.dataCollectionSDK) &&
      info.selectedTransformPlugins.length < 1
    ) {
      setTransformPluginEmptyError(true);
      return false;
    }
    return true;
  };

  const checkRedshiftServerlessConfig = (info: IExtPipeline) => {
    if (!info.redshiftServerlessVPC?.value) {
      setRedshiftServerlessVpcEmptyError(true);
      return false;
    }
    if (info.redshiftServerlessSG.length <= 0) {
      setRedshiftServerlessSGEmptyError(true);
      return false;
    }
    if (
      info.redshiftServerlessSubnets.length <= 0 ||
      !validateSubnetCrossInAZs(info.redshiftServerlessSubnets, 2) ||
      info.redshiftServerlessSubnets.length < 3
    ) {
      setRedshiftServerlessSubnetInvalidError(true);
      return false;
    }
    return true;
  };

  const checkRedshiftProvisionedConfig = (info: IExtPipeline) => {
    if (!info.selectedRedshiftCluster?.value) {
      setRedshiftProvisionedClusterEmptyError(true);
      return false;
    }
    const dbUser = info.dataModeling?.redshift?.provisioned?.dbUser.trim();
    if (!dbUser) {
      setRedshiftProvisionedDBUserEmptyError(true);
      return false;
    }
    if (
      !checkStringValidRegex(dbUser, new RegExp(REDSHIFT_DB_USER_NAME_PATTERN))
    ) {
      setRedshiftProvisionedDBUserFormatError(true);
      return false;
    }
    return true;
  };

  const validateDataProcessing = () => {
    if (!pipelineInfo.enableDataProcessing) {
      return true;
    }

    if (!checkDataProcessingInterval(pipelineInfo)) {
      return false;
    }

    if (!checkTransformPluginEmpty(pipelineInfo)) {
      return false;
    }

    if (pipelineInfo.enableRedshift) {
      if (
        pipelineInfo.redshiftType === 'serverless' &&
        !checkRedshiftServerlessConfig(pipelineInfo)
      ) {
        return false;
      }

      if (
        pipelineInfo.redshiftType === 'provisioned' &&
        !checkRedshiftProvisionedConfig(pipelineInfo)
      ) {
        return false;
      }
    }

    return true;
  };

  const validateReporting = () => {
    if (quickSightDisabled && pipelineInfo.enableReporting) {
      return false;
    }

    if (pipelineInfo.enableReporting && !pipelineInfo.selectedQuickSightUser) {
      setQuickSightUserEmptyError(true);
      return false;
    }

    return true;
  };

  const setQuickSightStatus = (quickSightAvailable: boolean) => {
    // Set QuickSight disabled
    if (quickSightAvailable) {
      // Set QuickSight Default Enable when QuickSight Available
      setPipelineInfo((prev) => {
        return {
          ...prev,
          enableReporting: true,
        };
      });
    } else {
      setPipelineInfo((prev) => {
        return {
          ...prev,
          enableReporting: false,
        };
      });
    }
  };

  const setAGAStatus = (agaAvailable: boolean) => {
    // Set AGA disabled
    if (!agaAvailable) {
      // Set AGA Disabled when AGA Not Available
      setPipelineInfo((prev) => {
        return {
          ...prev,
          ingestionServer: {
            ...prev.ingestionServer,
            loadBalancer: {
              ...prev.ingestionServer.loadBalancer,
              enableGlobalAccelerator: false,
            },
          },
        };
      });
    }
  };

  const setMSKStatus = (mskAvailable: boolean) => {
    // Set MSK Disable and Apache Kafka connector Disabled
    if (mskAvailable) {
      setPipelineInfo((prev) => {
        return {
          ...prev,
          kafkaSelfHost: false, // Change to MSK as default
          enableDataProcessing: true, // enable data processing
          ingestionServer: {
            ...prev.ingestionServer,
            sinkKafka: {
              ...prev.ingestionServer.sinkKafka,
              kafkaConnector: {
                enable: true,
              },
            },
          },
        };
      });
    } else {
      setPipelineInfo((prev) => {
        return {
          ...prev,
          kafkaSelfHost: true, // Change to self hosted as default
          enableDataProcessing: ternary(
            pipelineInfo.ingestionServer.sinkType === SinkType.MSK,
            false,
            true
          ), // disabled all data processing when sink type is MSK and MSK not available
          ingestionServer: {
            ...prev.ingestionServer,
            sinkKafka: {
              ...prev.ingestionServer.sinkKafka,
              kafkaConnector: {
                enable: false,
              },
            },
          },
        };
      });
    }
  };

  const setRedshiftStatus = (redshiftServerlessAvailable: boolean) => {
    // Set redshift serverless Disabled
    if (redshiftServerlessAvailable) {
      setPipelineInfo((prev) => {
        return {
          ...prev,
          redshiftType: 'serverless', // change to serverless as default
        };
      });
    } else {
      setPipelineInfo((prev) => {
        return {
          ...prev,
          redshiftType: 'provisioned', // change to provisioned as default
        };
      });
    }
  };

  const setDataProcessorStatus = (emrAvailable: boolean) => {
    // Set data processing Disabled when emr-serverless not available
    if (emrAvailable) {
      setPipelineInfo((prev) => {
        return {
          ...prev,
          enableDataProcessing: true, // Default to enable data processing
        };
      });
    } else {
      setPipelineInfo((prev) => {
        return {
          ...prev,
          enableDataProcessing: false, // disabled all data processing
        };
      });
    }
  };

  const findServiceAvailability = (
    data: ServiceAvailableResponse[],
    serviceName: string
  ) => {
    return (
      data.find((element) => element.service === serviceName)?.available ??
      false
    );
  };

  const validServiceAvailable = async (region: string) => {
    if (region) {
      // Reset Error Message
      setRegionEmptyError(false);
      setVPCEmptyError(false);
      setPublicSubnetError(false);
      setPrivateSubnetError(false);
      setPrivateSubnetDiffWithPublicError(false);
      setUnSupportedServices('');
      setQuickSightUserEmptyError(false);
      try {
        setLoadingServiceAvailable(true);
        const { success, data }: ApiResponse<ServiceAvailableResponse[]> =
          await checkServicesAvailable({ region });
        if (success && data) {
          // Set Service available
          const agaAvailable = findServiceAvailability(
            data,
            'global-accelerator'
          );
          const emrAvailable = findServiceAvailability(data, 'emr-serverless');
          const redshiftServerlessAvailable = findServiceAvailability(
            data,
            'redshift-serverless'
          );
          const mskAvailable = findServiceAvailability(data, 'msk');
          const quickSightAvailable = findServiceAvailability(
            data,
            'quicksight'
          );
          setPipelineInfo((prev) => {
            return {
              ...prev,
              serviceStatus: {
                AGA: agaAvailable,
                EMR_SERVERLESS: emrAvailable,
                REDSHIFT_SERVERLESS: redshiftServerlessAvailable,
                MSK: mskAvailable,
                QUICK_SIGHT: quickSightAvailable,
              },
            };
          });
          if (!update) {
            // Set show alert information when has unsupported services
            const unSupportedServiceList = data.filter(
              (service) => !service.available
            );
            if (unSupportedServiceList.length > 0) {
              setUnSupportedServices(
                unSupportedServiceList
                  .map((service) => service.service)
                  .join(',')
              );
              setPipelineInfo((prev) => {
                return {
                  ...prev,
                  showServiceStatus: true,
                };
              });
            }
            setQuickSightStatus(quickSightAvailable);
            setAGAStatus(agaAvailable);
            setMSKStatus(mskAvailable);
            setRedshiftStatus(redshiftServerlessAvailable);
            setDataProcessorStatus(emrAvailable);
          }
        }
        setLoadingServiceAvailable(false);
      } catch (error) {
        setLoadingServiceAvailable(false);
      }
    }
  };

  const processDataProcessing = (createPipelineObj: any) => {
    createPipelineObj.dataProcessing.dataFreshnessInHour =
      pipelineInfo.selectedEventFreshUnit?.value === 'day'
        ? parseInt(pipelineInfo.eventFreshValue) * 24
        : parseInt(pipelineInfo.eventFreshValue) || 72;

    createPipelineObj.dataProcessing.scheduleExpression = generateCronDateRange(
      pipelineInfo.selectedExcutionType?.value,
      parseInt(pipelineInfo.excutionFixedValue),
      pipelineInfo.exeCronExp,
      pipelineInfo.selectedExcutionUnit,
      'processing'
    );

    // set plugin value
    createPipelineObj.dataProcessing.transformPlugin = defaultStr(
      pipelineInfo.selectedTransformPlugins?.[0]?.id
    );
    createPipelineObj.dataProcessing.enrichPlugin =
      pipelineInfo.selectedEnrichPlugins.map((element) => element.id);

    // set redshift schedule
    createPipelineObj.dataModeling.redshift.dataRange =
      generateRedshiftInterval(
        parseInt(pipelineInfo.redshiftExecutionValue),
        pipelineInfo.selectedRedshiftExecutionUnit?.value
      );

    // set dataModeling to null when not enable Redshift
    if (!pipelineInfo.enableRedshift) {
      createPipelineObj.dataModeling.redshift = null;
    } else {
      // set serverless to null when user select provisioned
      if (pipelineInfo.redshiftType === 'provisioned') {
        createPipelineObj.dataModeling.redshift.newServerless = null;
      }

      // set provisioned to null when user select serverless
      if (pipelineInfo.redshiftType === 'serverless') {
        createPipelineObj.dataModeling.redshift.provisioned = null;
      }
    }
    return createPipelineObj;
  };

  const removeTemporaryProperties = (
    obj: any,
    propertiesToRemove: string[]
  ) => {
    propertiesToRemove.forEach((prop) => {
      delete obj[prop];
    });
  };

  const confirmCreatePipeline = async () => {
    let createPipelineObj: any = cloneDeep(pipelineInfo);
    if (createPipelineObj.enableDataProcessing) {
      createPipelineObj = processDataProcessing(createPipelineObj);
    } else {
      createPipelineObj.dataProcessing = null;
      // set dataModeling to null when disable data processing
      createPipelineObj.dataModeling = null;
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

    // set reporting empty when not enable reporting
    if (!createPipelineObj.enableReporting) {
      createPipelineObj.reporting = null;
    }

    const propertiesToRemove = [
      'selectedRegion',
      'selectedVPC',
      'selectedSDK',
      'selectedS3Bucket',
      'selectedPublicSubnet',
      'selectedPrivateSubnet',
      'enableEdp',
      'selectedCertificate',
      'mskCreateMethod',
      'selectedMSK',
      'seledtedKDKProvisionType',
      'enableDataProcessing',
      'scheduleExpression',
      'exeCronExp',
      'excutionFixedValue',
      'enableRedshift',
      'eventFreshValue',
      'redshiftExecutionValue',
      'selectedExcutionType',
      'selectedExcutionUnit',
      'selectedEventFreshUnit',
      'selectedRedshiftCluster',
      'selectedRedshiftRole',
      'selectedRedshiftExecutionUnit',
      'selectedTransformPlugins',
      'selectedEnrichPlugins',
      'selectedSecret',
      'kafkaSelfHost',
      'kafkaBrokers',
      'arnAccountId',
      'enableReporting',
      'selectedQuickSightUser',
      'dataConnectionType',
      'quickSightVpcConnection',
      'enableAuthentication',
      'redshiftType',
      'redshiftServerlessVPC',
      'redshiftBaseCapacity',
      'redshiftServerlessSG',
      'redshiftServerlessSubnets',
      'redshiftDataLoadValue',
      'redshiftDataLoadUnit',
      'selectedSelfHostedMSKSG',
      'selectedDataLoadType',
      'dataLoadCronExp',
      'serviceStatus',
      'showServiceStatus',
      'enrichPluginChanged',
      'transformPluginChanged',
    ];
    // remove temporary properties
    removeTemporaryProperties(createPipelineObj, propertiesToRemove);

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

  // Monitor Region Changed and validate Service Available
  useEffect(() => {
    if (pipelineInfo.region) {
      if (!update) {
        setPipelineInfo((prev) => {
          return {
            ...prev,
            // Below to set resources to empty by regions
            selectedVPC: null,
            selectedS3Bucket: null,
            selectedPublicSubnet: [],
            selectedPrivateSubnet: [],
            selectedSecret: null, // clear secret
            selectedCertificate: null, // clear certificates
            showServiceStatus: false,
            redshiftBaseCapacity: null,
            redshiftServerlessSG: [],
            redshiftServerlessVPC: null,
            redshiftServerlessSubnets: [],
            ingestionServer: {
              ...prev.ingestionServer,
              sinkS3: {
                // set sink s3 to null
                ...prev.ingestionServer.sinkS3,
                sinkBucket: {
                  name: '',
                  prefix: '',
                },
              },
              domain: {
                ...prev.ingestionServer.domain,
                certificateArn: '', // set certificate arn to empty
              },
              loadBalancer: {
                ...prev.ingestionServer.loadBalancer,
                authenticationSecretArn: '', // set secret value to null
                logS3Bucket: {
                  ...prev.ingestionServer.loadBalancer.logS3Bucket,
                  name: '',
                },
              },
            },
          };
        });
      }
      validServiceAvailable(pipelineInfo.region);
    }
  }, [pipelineInfo.region]);

  return (
    <Wizard
      i18nStrings={{
        stepNumberLabel: (stepNumber) => `${t('step')} ${stepNumber}`,
        collapsedStepsLabel: (stepNumber, stepsCount) =>
          `${t('step')} ${stepNumber} ${t('of')} ${stepsCount}`,
        navigationAriaLabel: defaultStr(t('steps'), 'Steps'),
        cancelButton: defaultStr(t('button.cancel')),
        previousButton: defaultStr(t('button.previous')),
        nextButton: defaultStr(t('button.next')),
        submitButton: update
          ? defaultStr(t('button.save'))
          : defaultStr(t('button.create')),
        optional: defaultStr(t('optional'), 'optional'),
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
        if (detail.requestedStepIndex === 4 && !validateReporting()) {
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
      isLoadingNextStep={
        loadingCreate || loadingServiceAvailable || loadingQuickSight
      }
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
              tagsKeyValueEmptyError={tagsKeyValueEmptyError}
              pipelineInfo={pipelineInfo}
              assetsS3BucketEmptyError={assetsBucketEmptyError}
              loadingServiceAvailable={loadingServiceAvailable}
              unSupportedServices={unSupportedServices}
              changeRegion={(region) => {
                // Change Region
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedRegion: region,
                    region: defaultStr(region.value),
                  };
                });
              }}
              changeVPC={(vpc) => {
                setVPCEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedVPC: vpc,
                    selectedMSK: null, // set selected msk to null,
                    ingestionServer: {
                      // set msk value to null
                      ...prev.ingestionServer,
                      sinkKafka: {
                        ...prev.ingestionServer.sinkKafka,
                        mskCluster: {
                          name: '',
                          arn: '',
                        },
                      },
                    },
                    selectedPublicSubnet: [], // set public subnets to empty
                    selectedPrivateSubnet: [], // set private subnets to empty
                    network: {
                      ...prev.network,
                      vpcId: defaultStr(vpc.value),
                      publicSubnetIds: [], // clear public subnets value
                      privateSubnetIds: [], // clear private subnets value
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
                    dataCollectionSDK: defaultStr(sdk.value),
                    selectedTransformPlugins: [],
                  };
                });
              }}
              changeS3Bucket={(bucket) => {
                setAssetsBucketEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedS3Bucket: bucket,
                    bucket: {
                      ...prev.bucket,
                      name: defaultStr(bucket.value),
                    },
                    ingestionServer: {
                      ...prev.ingestionServer,
                      loadBalancer: {
                        ...prev.ingestionServer.loadBalancer,
                        logS3Bucket: {
                          ...prev.ingestionServer.loadBalancer.logS3Bucket,
                          name: defaultStr(bucket.value),
                        },
                      },
                      sinkKinesis: {
                        ...prev.ingestionServer.sinkKinesis,
                        sinkBucket: {
                          ...prev.ingestionServer.sinkKinesis.sinkBucket,
                          name: defaultStr(bucket.value),
                        },
                      },
                      sinkS3: {
                        ...prev.ingestionServer.sinkS3,
                        sinkBucket: {
                          ...prev.ingestionServer.sinkS3.sinkBucket,
                          name: defaultStr(bucket.value),
                        },
                      },
                    },
                    dataProcessing: {
                      ...prev.dataProcessing,
                      sourceS3Bucket: {
                        ...prev.dataProcessing.sourceS3Bucket,
                        name: defaultStr(bucket.value),
                      },
                      sinkS3Bucket: {
                        ...prev.dataProcessing.sinkS3Bucket,
                        name: defaultStr(bucket.value),
                      },
                      pipelineBucket: {
                        ...prev.dataProcessing.pipelineBucket,
                        name: defaultStr(bucket.value),
                      },
                    },
                  };
                });
              }}
              changeTags={(tags) => {
                setTagsKeyValueEmptyError(false);
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
              privateSubnetDiffWithPublicError={
                privateSubnetDiffWithPublicError
              }
              domainNameEmptyError={domainNameEmptyError}
              domainNameFormatError={domainNameFormatError}
              certificateEmptyError={certificateEmptyError}
              bufferS3SizeFormatError={bufferS3SizeFormatError}
              bufferS3IntervalFormatError={bufferS3IntervalFormatError}
              acknowledgedHTTPSecurity={acknowledgedHTTPSecurity}
              sinkBatchSizeError={sinkBatchSizeError}
              sinkIntervalError={sinkIntervalError}
              minCapacityError={minCapacityError}
              maxCapacityError={maxCapacityError}
              warmPoolError={warmPoolError}
              corsFormatError={corsFormatError}
              secretEmptyError={secretEmptyError}
              mskEmptyError={mskEmptyError}
              topicFormatError={topicFormatError}
              brokerLinkEmptyError={brokerLinkEmptyError}
              brokerLinkFormatError={brokerLinkFormatError}
              kafkaSGEmptyError={kafkaSGEmptyError}
              bufferKDSModeEmptyError={bufferKDSModeEmptyError}
              bufferKDSShardNumFormatError={bufferKDSShardNumFormatError}
              changeNetworkType={(type) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    network: {
                      ...prev.network,
                      type: type,
                    },
                  };
                });
              }}
              changePublicSubnets={(subnets) => {
                setPublicSubnetError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedPublicSubnet: subnets,
                    network: {
                      ...prev.network,
                      publicSubnetIds: subnets.map((element) =>
                        defaultStr(element.value)
                      ),
                    },
                  };
                });
              }}
              changePrivateSubnets={(subnets) => {
                setPrivateSubnetError(false);
                setPrivateSubnetDiffWithPublicError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedPrivateSubnet: subnets,
                    network: {
                      ...prev.network,
                      privateSubnetIds: subnets.map((element) =>
                        defaultStr(element.value)
                      ),
                    },
                  };
                });
              }}
              changeIngestionType={(type) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      ingestionType: type,
                    },
                  };
                });
              }}
              changeServerMin={(min) => {
                setMinCapacityError(false);
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
                setMaxCapacityError(false);
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
                setWarmPoolError(false);
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
                setDomainNameFormatError(false);
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
                setSecretEmptyError(false);
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
                setDomainNameEmptyError(false);
                setDomainNameFormatError(false);
                setCertificateEmptyError(false);
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
                setCorsFormatError(false);
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
                        certificateArn: defaultStr(cert.value),
                      },
                    },
                  };
                });
              }}
              changeSSMSecret={(secret) => {
                setSecretEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedSecret: secret,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      loadBalancer: {
                        ...prev.ingestionServer.loadBalancer,
                        authenticationSecretArn: defaultStr(secret?.value),
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
                let tmpEnableProcessing = ternary(
                  pipelineInfo.serviceStatus.EMR_SERVERLESS,
                  true,
                  false
                );
                let tmpEnableQuickSight = ternary(
                  pipelineInfo.serviceStatus.QUICK_SIGHT,
                  true,
                  false
                );
                setSinkIntervalError(false);
                setSinkBatchSizeError(false);

                if (type === SinkType.MSK) {
                  if (
                    !pipelineInfo.ingestionServer.sinkKafka.kafkaConnector
                      .enable
                  ) {
                    tmpEnableProcessing = false;
                    tmpEnableQuickSight = false;
                  }
                }

                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    enableDataProcessing: tmpEnableProcessing,
                    enableReporting: tmpEnableQuickSight,
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
              changeS3BufferSize={(size) => {
                setBufferS3SizeFormatError(false);
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
                setBufferS3IntervalFormatError(false);
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
                setMskEmptyError(false);
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
                setKafkaSGEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedSelfHostedMSKSG: sg,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkKafka: {
                        ...prev.ingestionServer.sinkKafka,
                        securityGroupId: defaultStr(sg.value),
                      },
                    },
                  };
                });
              }}
              changeMSKTopic={(topic) => {
                setTopicFormatError(false);
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
                // if enable, set data processing enable
                if (enable) {
                  setPipelineInfo((prev) => {
                    return {
                      ...prev,
                      enableDataProcessing: ternary(
                        prev.serviceStatus.EMR_SERVERLESS,
                        true,
                        false
                      ),
                      enableReporting: ternary(
                        prev.serviceStatus.QUICK_SIGHT,
                        true,
                        false
                      ),
                      ingestionServer: {
                        ...prev.ingestionServer,
                        sinkKafka: {
                          ...prev.ingestionServer.sinkKafka,
                          kafkaConnector: {
                            enable: true,
                          },
                        },
                      },
                    };
                  });
                } else {
                  setPipelineInfo((prev) => {
                    return {
                      ...prev,
                      enableDataProcessing: false,
                      enableReporting: false,
                      ingestionServer: {
                        ...prev.ingestionServer,
                        sinkKafka: {
                          ...prev.ingestionServer.sinkKafka,
                          kafkaConnector: {
                            enable: false,
                          },
                        },
                      },
                    };
                  });
                }
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
                setBrokerLinkEmptyError(false);
                setBrokerLinkFormatError(false);
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
                setTopicFormatError(false);
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
                setBufferKDSModeEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    seledtedKDKProvisionType: type,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkKinesis: {
                        ...prev.ingestionServer.sinkKinesis,
                        kinesisStreamMode: defaultStr(type.value),
                      },
                    },
                  };
                });
              }}
              changeKDSShardNumber={(num) => {
                setBufferKDSShardNumFormatError(false);
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
              transformPluginEmptyError={transformPluginEmptyError}
              dataProcessorIntervalInvalidError={
                dataProcessorIntervalInvalidError
              }
              redshiftServerlessVpcEmptyError={redshiftServerlessVpcEmptyError}
              redshiftServerlessSGEmptyError={redshiftServerlessSGEmptyError}
              redshiftServerlessSubnetEmptyError={
                redshiftServerlessSubnetEmptyError
              }
              redshiftServerlessSubnetInvalidError={
                redshiftServerlessSubnetInvalidError
              }
              redshiftProvisionedClusterEmptyError={
                redshiftProvisionedClusterEmptyError
              }
              redshiftProvisionedDBUserEmptyError={
                redshiftProvisionedDBUserEmptyError
              }
              redshiftProvisionedDBUserFormatError={
                redshiftProvisionedDBUserFormatError
              }
              changeEnableDataProcessing={(enable) => {
                if (enable) {
                  // if enable data processing, default to enable quicksight
                  setPipelineInfo((prev) => {
                    return {
                      ...prev,
                      enableDataProcessing: true,
                      // Enable QuickSight When QuickSight Available
                      enableReporting: ternary(
                        prev.serviceStatus.QUICK_SIGHT,
                        true,
                        false
                      ),
                    };
                  });
                } else {
                  // if data processing not enable, disable quicksight
                  setPipelineInfo((prev) => {
                    return {
                      ...prev,
                      enableDataProcessing: false,
                      enableReporting: false,
                    };
                  });
                }
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
                    enrichPluginChanged: true,
                  };
                });
              }}
              changeTransformPlugins={(plugins) => {
                setTransformPluginEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedTransformPlugins: plugins,
                    transformPluginChanged: true,
                  };
                });
              }}
              changeEnableRedshift={(enable) => {
                if (enable) {
                  // if enable redshift, default to enable athena and quicksight
                  setPipelineInfo((prev) => {
                    return {
                      ...prev,
                      enableRedshift: true,
                      // Enable QuickSight When QuickSight Available
                      enableReporting: ternary(
                        prev.serviceStatus.QUICK_SIGHT,
                        true,
                        false
                      ),
                    };
                  });
                } else {
                  // if redshift not enable, disable athena and quicksight
                  setPipelineInfo((prev) => {
                    return {
                      ...prev,
                      enableRedshift: false,
                      enableReporting: false,
                    };
                  });
                }
              }}
              changeSelectedRedshift={(cluster) => {
                setRedshiftProvisionedClusterEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedRedshiftCluster: cluster,
                    arnAccountId: extractAccountIdFromArn(
                      defaultStr(cluster.description)
                    ),
                    dataModeling: {
                      ...prev.dataModeling,
                      redshift: {
                        ...prev.dataModeling.redshift,
                        provisioned: {
                          ...prev.dataModeling.redshift.provisioned,
                          clusterIdentifier: defaultStr(cluster.value),
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
                    dataModeling: {
                      ...prev.dataModeling,
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
                setRedshiftProvisionedDBUserEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    dataModeling: {
                      ...prev.dataModeling,
                      redshift: {
                        ...prev.dataModeling.redshift,
                        provisioned: {
                          ...prev.dataModeling.redshift.provisioned,
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
                    dataModeling: {
                      ...prev.dataModeling,
                      redshift: {
                        ...prev.dataModeling.redshift,
                        newServerless: {
                          ...prev.dataModeling.redshift.newServerless,
                          baseCapacity: parseInt(
                            defaultStr(capacity?.value, '0')
                          ),
                        },
                      },
                    },
                  };
                });
              }}
              changeServerlessRedshiftVPC={(vpc) => {
                setRedshiftServerlessVpcEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftServerlessVPC: vpc,
                    redshiftServerlessSG: [], // set selected security groups to empty
                    redshiftServerlessSubnets: [], // set selected subnets to empty
                    dataModeling: {
                      ...prev.dataModeling,
                      redshift: {
                        ...prev.dataModeling.redshift,
                        newServerless: {
                          ...prev.dataModeling.redshift.newServerless,
                          network: {
                            ...prev.dataModeling.redshift.newServerless.network,
                            vpcId: defaultStr(vpc.value),
                            securityGroups: [], // set security group value to empty
                            subnetIds: [], // set subnets value to empty
                          },
                        },
                      },
                    },
                  };
                });
              }}
              changeSecurityGroup={(sg) => {
                setRedshiftServerlessSGEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftServerlessSG: sg,
                    dataModeling: {
                      ...prev.dataModeling,
                      redshift: {
                        ...prev.dataModeling.redshift,
                        newServerless: {
                          ...prev.dataModeling.redshift.newServerless,
                          network: {
                            ...prev.dataModeling.redshift.newServerless.network,
                            securityGroups: sg.map((element) =>
                              defaultStr(element.value)
                            ),
                          },
                        },
                      },
                    },
                  };
                });
              }}
              changeReshiftSubnets={(subnets) => {
                setRedshiftServerlessSubnetEmptyError(false);
                setRedshiftServerlessSubnetInvalidError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    redshiftServerlessSubnets: subnets,
                    dataModeling: {
                      ...prev.dataModeling,
                      redshift: {
                        ...prev.dataModeling.redshift,
                        newServerless: {
                          ...prev.dataModeling.redshift.newServerless,
                          network: {
                            ...prev.dataModeling.redshift.newServerless.network,
                            subnetIds: subnets.map((element) =>
                              defaultStr(element.value)
                            ),
                          },
                        },
                      },
                    },
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
              quickSightUserEmptyError={quickSightUserEmptyError}
              changeQuickSightSelectedUser={(user) => {
                setQuickSightUserEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedQuickSightUser: user,
                    reporting: {
                      ...prev.reporting,
                      quickSight: {
                        ...prev.reporting?.quickSight,
                        user: user.value,
                      },
                    },
                  };
                });
              }}
              changeLoadingQuickSight={(loading) => {
                setloadingQuickSight(loading);
              }}
              changeQuickSightDisabled={(disabled) => {
                setQuickSightDisabled(disabled);
              }}
              changeEnableReporting={(enable) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    enableReporting: enable,
                  };
                });
              }}
              changeQuickSightAccountName={(name) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    reporting: {
                      ...prev.reporting,
                      quickSight: {
                        ...prev.reporting?.quickSight,
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
  const { pid } = useParams();

  const [loadingData, setLoadingData] = useState(true);
  const [updatePipeline, setUpdatePipeline] = useState<IExtPipeline>();

  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: update
        ? t('breadCrumb.updatePipeline')
        : t('breadCrumb.configPipeline'),
      href: '/',
    },
  ];
  const setUpdateRegion = async (pipelineInfo: IExtPipeline) => {
    pipelineInfo.selectedRegion = {
      label: AWS_REGION_MAP[pipelineInfo.region]?.RegionName
        ? defaultStr(t(AWS_REGION_MAP[pipelineInfo.region].RegionName))
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
  const setUpdateS3Bucket = async (pipelineInfo: IExtPipeline) => {
    try {
      const { success, data }: ApiResponse<S3Response[]> =
        await getS3BucketList(pipelineInfo.region);
      if (success) {
        const selectedS3Bucket = data.filter(
          (element) => element.name === pipelineInfo.bucket.name
        )[0];
        pipelineInfo.selectedS3Bucket = {
          label: selectedS3Bucket.name,
          value: selectedS3Bucket.name,
        };
      }
    } catch (error) {
      console.error(error);
    }
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
      if (pipelineInfo.ingestionServer.sinkType !== 'kafka') {
        return;
      }
      pipelineInfo.mskCreateMethod = ResourceCreateMethod.EXISTING;
      const { success, data }: ApiResponse<MSKResponse[]> = await getMSKList({
        vpcId: pipelineInfo.network.vpcId,
        region: pipelineInfo.region,
      });
      if (success) {
        const selectMsk = data.filter(
          (element) =>
            element.arn ===
            pipelineInfo.ingestionServer?.sinkKafka?.mskCluster?.arn
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
      if (pipelineInfo.ingestionServer.sinkType !== 'kafka') {
        return;
      }
      pipelineInfo.mskCreateMethod = ResourceCreateMethod.CREATE;
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
          (item) => item.id === pipelineInfo.dataProcessing.transformPlugin.id
        );
        const enrichPluginIds = pipelineInfo.dataProcessing.enrichPlugin.map(
          (item) => item.id
        );
        pipelineInfo.selectedEnrichPlugins = data.items.filter((item) =>
          enrichPluginIds.includes(defaultStr(item.id))
        );
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateNewServerlessVpc = async (pipelineInfo: IExtPipeline) => {
    try {
      const { success, data }: ApiResponse<VPCResponse[]> = await getVPCList({
        region: pipelineInfo.region,
      });
      if (success) {
        const selectVpc = data.filter(
          (element) =>
            element.id ===
            pipelineInfo.dataModeling.redshift.newServerless.network.vpcId
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
          vpcId: pipelineInfo.dataModeling.redshift.newServerless.network.vpcId,
        });
      if (success) {
        const selectSGs = data.filter((element) =>
          pipelineInfo.dataModeling.redshift.newServerless.network.securityGroups.includes(
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
    if (!pipelineInfo.dataModeling?.redshift?.newServerless) {
      return;
    }
    try {
      const { success, data }: ApiResponse<SubnetResponse[]> =
        await getSubnetList({
          region: pipelineInfo.region,
          vpcId: pipelineInfo.dataModeling.redshift.newServerless.network.vpcId,
        });
      if (success) {
        const selectSubnets = data.filter((element) =>
          pipelineInfo.dataModeling.redshift.newServerless.network.subnetIds.includes(
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
    if (!pipelineInfo.dataModeling?.redshift?.provisioned) {
      return;
    }
    try {
      const { success, data }: ApiResponse<RedshiftResponse[]> =
        await getRedshiftCluster({
          region: pipelineInfo.region,
        });
      if (success) {
        const selectCluster = data.filter(
          (element) =>
            element.name ===
            pipelineInfo.dataModeling.redshift.provisioned.clusterIdentifier
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
      pipelineInfo.dataProcessing.scheduleExpression
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
      pipelineInfo.dataProcessing.dataFreshnessInHour
    );
    pipelineInfo.eventFreshValue = reverseFreshness.value;
    pipelineInfo.selectedEventFreshUnit = {
      label: reverseFreshness.unit === 'hour' ? 'Hours' : 'Days',
      value: reverseFreshness.unit,
    };
    await setUpdateListPlugins(pipelineInfo);

    pipelineInfo.enableRedshift = !(
      isEmpty(pipelineInfo.dataModeling?.redshift?.newServerless) &&
      isEmpty(pipelineInfo.dataModeling?.redshift?.provisioned)
    );

    pipelineInfo.redshiftType = !isEmpty(
      pipelineInfo.dataModeling.redshift.newServerless
    )
      ? 'serverless'
      : 'provisioned';
    if (pipelineInfo.redshiftType === 'serverless') {
      pipelineInfo.redshiftBaseCapacity = generateRedshiftRPUOptionListByRegion(
        pipelineInfo.region
      ).filter(
        (type: SelectProps.Option) =>
          type.value ===
          pipelineInfo.dataModeling.redshift.newServerless.baseCapacity.toString()
      )[0];
      await setUpdateNewServerlessVpc(pipelineInfo);
      await setUpdateNewServerlessSG(pipelineInfo);
      await setUpdateNewServerlessSubnets(pipelineInfo);
    } else if (pipelineInfo.redshiftType === 'provisioned') {
      await setUpdateProvisionedRedshiftCluster(pipelineInfo);
    }

    const reverseRedshiftDataRange = reverseRedshiftInterval(
      pipelineInfo.dataModeling.redshift.dataRange
    );
    pipelineInfo.redshiftExecutionValue = reverseRedshiftDataRange.value;
    pipelineInfo.selectedRedshiftExecutionUnit = REDSHIFT_UNIT_LIST.filter(
      (type) => type.value === reverseRedshiftDataRange.unit
    )[0];
  };

  const setUpdateQuickSightUser = async (pipelineInfo: IExtPipeline) => {
    if (!pipelineInfo.reporting?.quickSight.user) {
      return;
    }
    try {
      const { success, data }: ApiResponse<any[]> = await getQuickSightUsers();
      if (success) {
        const selectUser = data.filter(
          (element) => element.Arn === pipelineInfo.reporting.quickSight.user
        )[0];
        pipelineInfo.selectedQuickSightUser = {
          label: selectUser.UserName,
          value: selectUser.Arn,
          description: selectUser.Email,
          labelTag: selectUser.Role,
          disabled: selectUser.Role !== 'ADMIN',
        };
      }
    } catch (error) {
      console.error(error);
    }
  };
  const setUpdateReport = async (pipelineInfo: IExtPipeline) => {
    if (!pipelineInfo.enableReporting) {
      return;
    } else {
      await setUpdateQuickSightUser(pipelineInfo);
    }
  };
  const getDefaultExtPipeline = (data: IExtPipeline): IExtPipeline => {
    const res: IExtPipeline = {
      ...INIT_EXT_PIPELINE_DATA,
      id: defaultStr(data.id),
      type: defaultStr(data.type),
      prefix: defaultStr(data.prefix),
      projectId: defaultStr(data.projectId),
      pipelineId: defaultStr(data.pipelineId),
      region: defaultStr(data.region),
      dataCollectionSDK: defaultStr(data.dataCollectionSDK),
      tags: defaultGenericsValue(data.tags, []),
      network: {
        vpcId: defaultStr(data.network.vpcId),
        publicSubnetIds: defaultGenericsValue(data.network.publicSubnetIds, []),
        privateSubnetIds: defaultGenericsValue(
          data.network.privateSubnetIds,
          []
        ),
        type: defaultStr(
          data.network.type,
          ENetworkType.General
        ) as ENetworkType,
      },
      bucket: {
        name: defaultStr(data.bucket?.name),
        prefix: defaultStr(data.bucket?.prefix),
      },
      ingestionServer: {
        ingestionType: defaultStr(
          data.ingestionServer.ingestionType,
          EIngestionType.EC2
        ) as EIngestionType,
        size: {
          serverMin: defaultGenericsValue(
            data.ingestionServer.size.serverMin,
            2
          ),
          serverMax: defaultGenericsValue(
            data.ingestionServer.size.serverMax,
            4
          ),
          warmPoolSize: defaultGenericsValue(
            data.ingestionServer.size.warmPoolSize,
            1
          ),
          scaleOnCpuUtilizationPercent: defaultGenericsValue(
            data.ingestionServer.size.scaleOnCpuUtilizationPercent,
            50
          ),
        },
        domain: {
          domainName: defaultStr(data.ingestionServer.domain.domainName),
          certificateArn: defaultStr(
            data.ingestionServer.domain.certificateArn
          ),
        },
        loadBalancer: {
          serverEndpointPath: defaultStr(
            data.ingestionServer.loadBalancer.serverEndpointPath,
            '/collect'
          ),
          serverCorsOrigin: defaultStr(
            data.ingestionServer.loadBalancer.serverCorsOrigin
          ),
          protocol: defaultStr(
            data.ingestionServer.loadBalancer.protocol,
            ProtocalType.HTTPS
          ),
          enableGlobalAccelerator: defaultGenericsValue(
            data.ingestionServer.loadBalancer.enableGlobalAccelerator,
            false
          ),
          enableApplicationLoadBalancerAccessLog: defaultGenericsValue(
            data.ingestionServer.loadBalancer
              .enableApplicationLoadBalancerAccessLog,
            false
          ),
          authenticationSecretArn: defaultStr(
            data.ingestionServer.loadBalancer.authenticationSecretArn
          ),
          logS3Bucket: {
            name: defaultStr(
              data.ingestionServer.loadBalancer.logS3Bucket.name
            ),
            prefix: defaultStr(
              data.ingestionServer.loadBalancer.logS3Bucket.prefix
            ),
          },
          notificationsTopicArn: defaultStr(
            data.ingestionServer.loadBalancer.notificationsTopicArn
          ),
        },
        sinkType: defaultStr(data.ingestionServer.sinkType, SinkType.MSK),
        sinkBatch: {
          size: defaultGenericsValue(
            data.ingestionServer.sinkBatch?.size,
            50000
          ),
          intervalSeconds: defaultGenericsValue(
            data.ingestionServer.sinkBatch?.intervalSeconds,
            3000
          ),
        },
        sinkS3: {
          sinkBucket: {
            name: defaultStr(data.ingestionServer.sinkS3?.sinkBucket?.name),
            prefix: defaultStr(data.ingestionServer.sinkS3?.sinkBucket?.prefix),
          },
          s3BufferSize: defaultGenericsValue(
            data.ingestionServer.sinkS3?.s3BufferSize,
            10
          ),
          s3BufferInterval: defaultGenericsValue(
            data.ingestionServer.sinkS3?.s3BufferInterval,
            300
          ),
        },
        sinkKafka: {
          brokers: defaultGenericsValue(
            data.ingestionServer.sinkKafka?.brokers,
            []
          ),
          topic: defaultStr(data.ingestionServer.sinkKafka?.topic),
          securityGroupId: defaultStr(
            data.ingestionServer.sinkKafka?.securityGroupId
          ),
          mskCluster: {
            name: defaultStr(data.ingestionServer.sinkKafka?.mskCluster?.name),
            arn: defaultStr(data.ingestionServer.sinkKafka?.mskCluster?.arn),
          },
          kafkaConnector: {
            enable:
              data.ingestionServer.sinkKafka?.kafkaConnector?.enable ?? true,
          },
        },
        sinkKinesis: {
          kinesisStreamMode: defaultStr(
            data.ingestionServer.sinkKinesis?.kinesisStreamMode
          ),
          kinesisShardCount: defaultGenericsValue(
            data.ingestionServer.sinkKinesis?.kinesisShardCount,
            2
          ),
          sinkBucket: {
            name: defaultStr(data.ingestionServer.sinkKinesis?.sinkBucket.name),
            prefix: defaultStr(
              data.ingestionServer.sinkKinesis?.sinkBucket.prefix
            ),
          },
        },
      },
      dataProcessing: {
        dataFreshnessInHour: defaultGenericsValue(
          data.dataProcessing?.dataFreshnessInHour,
          72
        ),
        scheduleExpression: defaultStr(data.dataProcessing?.scheduleExpression),
        sourceS3Bucket: {
          name: defaultStr(data.dataProcessing?.sourceS3Bucket?.name),
          prefix: defaultStr(data.dataProcessing?.sourceS3Bucket?.prefix),
        },
        sinkS3Bucket: {
          name: defaultStr(data.dataProcessing?.sinkS3Bucket?.name),
          prefix: defaultStr(data.dataProcessing?.sinkS3Bucket?.prefix),
        },
        pipelineBucket: {
          name: defaultStr(data.dataProcessing?.pipelineBucket?.name),
          prefix: defaultStr(data.dataProcessing?.pipelineBucket?.prefix),
        },
        transformPlugin: defaultStr(data.dataProcessing?.transformPlugin),
        enrichPlugin: defaultGenericsValue(
          data.dataProcessing?.enrichPlugin,
          []
        ),
      },
      dataModeling: {
        athena: data.dataModeling?.athena ?? false,
        redshift: {
          dataRange: defaultGenericsValue(
            data.dataModeling?.redshift?.dataRange,
            0
          ),
          provisioned: data.dataModeling?.redshift?.provisioned ?? null,
          newServerless: data.dataModeling?.redshift?.newServerless ?? null,
        },
      },
      statusType: data.statusType,
      stackDetails: defaultGenericsValue(data.stackDetails, []),
      executionDetail: data.executionDetail,
      workflow: data.workflow,
      version: defaultStr(data.version),
      versionTag: defaultStr(data.versionTag),
      createAt: defaultGenericsValue(data.createAt, 0),
      updateAt: defaultGenericsValue(data.updateAt, 0),
      operator: defaultStr(data.operator),
      deleted: defaultGenericsValue(data.deleted, false),
    };
    res.enableDataProcessing = !isEmpty(data.dataProcessing);
    res.enableReporting = !isEmpty(data.reporting);
    if (res.enableReporting) {
      res.reporting = data.reporting;
    }
    res.kafkaSelfHost = isEmpty(
      res.ingestionServer?.sinkKafka?.mskCluster?.name
    );
    return res;
  };
  const getProjectPipelineDetail = async () => {
    if (update) {
      try {
        setLoadingData(true);
        const { success, data }: ApiResponse<IExtPipeline> =
          await getPipelineDetail({
            projectId: defaultStr(pid),
          });
        if (success) {
          const extPipeline = getDefaultExtPipeline(data);
          Promise.all([
            setUpdateRegion(extPipeline),
            setUpdateVpc(extPipeline),
            setUpdateSDK(extPipeline),
            setUpdateS3Bucket(extPipeline),
            setUpdateSubnetList(extPipeline),
            setUpdateCetificate(extPipeline),
            setUpdateSSMSecret(extPipeline),
            extPipeline.kafkaSelfHost
              ? setUpdateKafkaSelfHosted(extPipeline)
              : setUpdateMSKCluster(extPipeline),
            setUpdateKDSType(extPipeline),
            setUpdateETL(extPipeline),
            setUpdateReport(extPipeline),
          ])
            .then(() => {
              setUpdatePipeline(extPipeline);
              setLoadingData(false);
            })
            .catch((error) => {
              console.error(error);
              setLoadingData(false);
            });
        }
      } catch (error) {
        setLoadingData(false);
      }
    }
  };

  useEffect(() => {
    if (update) {
      getProjectPipelineDetail();
    } else {
      setLoadingData(false);
    }
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
