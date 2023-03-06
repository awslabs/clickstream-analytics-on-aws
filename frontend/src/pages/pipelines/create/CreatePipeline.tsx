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
import { createProjectPipeline } from 'apis/pipeline';
import CustomBreadCrumb from 'components/layouts/CustomBreadCrumb';
import Navigation from 'components/layouts/Navigation';
import cloneDeep from 'lodash/cloneDeep';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ProtocalType, SinkType } from 'ts/const';
import BasicInformation from './steps/BasicInformation';
import ConfigETL from './steps/ConfigETL';
import ConfigIngestion from './steps/ConfigIngestion';
import Reporting from './steps/Reporting';
import ReviewAndLaunch from './steps/ReviewAndLaunch';

const Content: React.FC = () => {
  const { projectId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const [nameEmptyError, setNameEmptyError] = useState(false);
  const [regionEmptyError, setRegionEmptyError] = useState(false);
  const [vpcEmptyError, setVPCEmptyError] = useState(false);
  const [sdkEmptyError, setSDKEmptyError] = useState(false);

  const [publicSubnetError, setPublicSubnetError] = useState(false);
  const [privateSubnetError, setPrivateSubnetError] = useState(false);
  const [domainNameEmptyError, setDomainNameEmptyError] = useState(false);
  const [hostedZoneEmptyError, setHostedZoneEmptyError] = useState(false);

  const [bufferS3BucketEmptyError, setBufferS3BucketEmptyError] =
    useState(false);

  const [pipelineInfo, setPipelineInfo] = useState<IExtPipeline>({
    projectId: projectId ?? ''.toString(),
    name: '',
    description: '',
    region: '',
    dataCollectionSDK: '',
    tags: [],
    ingestionServer: {
      network: {
        vpcId: '',
        publicSubnetIds: [],
        privateSubnetIds: [],
      },
      size: {
        serverMin: '2',
        serverMax: '4',
        warmPoolSize: '1',
        scaleOnCpuUtilizationPercent: '50',
      },
      domain: {
        hostedZoneId: '',
        hostedZoneName: '',
        recordName: 'click',
      },
      loadBalancer: {
        serverEndpointPath: '/collect',
        serverCorsOrigin: '',
        protocol: ProtocalType.HTTPS,
        enableApplicationLoadBalancerAccessLog: true,
        logS3Bucket: '',
        logS3Prefix: '',
        notificationsTopicArn: '',
      },
      sinkType: SinkType.S3,
      sinkS3: {
        s3DataBucket: '',
        s3DataPrefix: '',
        s3BufferSize: '10',
        s3BufferInterval: '300',
      },
      sinkMSK: '',
      sinkKDS: '',
    },
    etl: {},
    dataModel: {},

    selectedRegion: null,
    selectedVPC: null,
    selectedSDK: null,
    selectedPublicSubnet: [],
    selectedPrivateSubnet: [],
    enableEdp: true,
    selectedHostedZone: null,
  });

  const validateBasicInfo = () => {
    if (!pipelineInfo.name.trim()) {
      setNameEmptyError(true);
      return false;
    }
    if (!pipelineInfo.selectedRegion) {
      setRegionEmptyError(true);
      return false;
    }
    if (!pipelineInfo.selectedVPC) {
      setVPCEmptyError(true);
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
    if (pipelineInfo.enableEdp) {
      if (!pipelineInfo.ingestionServer.domain.recordName.trim()) {
        setDomainNameEmptyError(true);
        return false;
      }
      if (!pipelineInfo.selectedHostedZone) {
        setHostedZoneEmptyError(true);
        return false;
      }
    }
    if (pipelineInfo.ingestionServer.sinkType === SinkType.S3) {
      if (!pipelineInfo.ingestionServer.sinkS3.s3DataBucket.trim()) {
        setBufferS3BucketEmptyError(true);
        return false;
      }
    }
    return true;
  };

  const confirmCreatePipeline = async () => {
    const createPipelineObj: any = cloneDeep(pipelineInfo);
    // remove temporary properties
    delete createPipelineObj.selectedRegion;
    delete createPipelineObj.selectedVPC;
    delete createPipelineObj.selectedSDK;
    delete createPipelineObj.selectedPublicSubnet;
    delete createPipelineObj.selectedPrivateSubnet;
    delete createPipelineObj.enableEdp;
    delete createPipelineObj.selectedHostedZone;
    setLoadingCreate(true);
    try {
      const { success, data }: ApiResponse<ResponseCreate> =
        await createProjectPipeline(createPipelineObj);
      if (success && data.id) {
        navigate(`/project/detail/${projectId}`);
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
        cancelButton: t('button.cancel'),
        previousButton: t('button.previous'),
        nextButton: t('button.next'),
        submitButton: t('button.create'),
        optional: t('optional') || 'optional',
      }}
      onNavigate={({ detail }) => {
        if (detail.requestedStepIndex === 1 && !validateBasicInfo()) {
          return;
        }
        setActiveStepIndex(detail.requestedStepIndex);
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
      // allowSkipTo
      steps={[
        {
          title: t('pipeline:create.basicInfo'),
          content: (
            <BasicInformation
              nameEmptyError={nameEmptyError}
              regionEmptyError={regionEmptyError}
              vpcEmptyError={vpcEmptyError}
              sdkEmptyError={sdkEmptyError}
              pipelineInfo={pipelineInfo}
              changePipelineName={(name) => {
                setNameEmptyError(false);
                setPipelineInfo((prev) => {
                  return { ...prev, name: name };
                });
              }}
              changeDescription={(desc) => {
                setPipelineInfo((prev) => {
                  return { ...prev, description: desc };
                });
              }}
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
                    ingestionServer: {
                      ...prev.ingestionServer,
                      network: {
                        ...prev.ingestionServer.network,
                        vpcId: vpc.value || '',
                      },
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
              pipelineInfo={pipelineInfo}
              publicSubnetError={publicSubnetError}
              privateSubnetError={privateSubnetError}
              domainNameEmptyError={domainNameEmptyError}
              hostedZoneEmptyError={hostedZoneEmptyError}
              bufferS3BucketEmptyError={bufferS3BucketEmptyError}
              changePublicSubnets={(subnets) => {
                setPublicSubnetError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedPublicSubnet: subnets,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      network: {
                        ...prev.ingestionServer.network,
                        publicSubnetIds: subnets.map(
                          (element) => element.value || ''
                        ),
                      },
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
                    ingestionServer: {
                      ...prev.ingestionServer,
                      network: {
                        ...prev.ingestionServer.network,
                        privateSubnetIds: subnets.map(
                          (element) => element.value || ''
                        ),
                      },
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
                        serverMin: min,
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
                        serverMax: max,
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
                        warmPoolSize: size,
                      },
                    },
                  };
                });
              }}
              changeEnableEdp={(enable) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    enableEdp: enable,
                  };
                });
              }}
              changeRecordName={(name) => {
                setDomainNameEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      domain: {
                        ...prev.ingestionServer.domain,
                        recordName: name,
                      },
                    },
                  };
                });
              }}
              changeProtocal={(protocal) => {
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
              changeHostedZone={(zone) => {
                setHostedZoneEmptyError(false);
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    selectedHostedZone: zone,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      domain: {
                        ...prev.ingestionServer.domain,
                        hostedZoneId: zone.value || '',
                        hostedZoneName: zone.label || '',
                      },
                    },
                  };
                });
              }}
              changeBufferType={(type) => {
                setPipelineInfo((prev) => {
                  return {
                    ...prev,
                    ingestionServer: {
                      ...prev.ingestionServer,
                      sinkType: type,
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
                        s3DataBucket: bucket,
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
                        s3DataPrefix: prefix,
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
                        s3BufferSize: size,
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
                        s3BufferInterval: interval,
                      },
                    },
                  };
                });
              }}
            />
          ),
        },
        {
          title: t('pipeline:create.configETL'),
          content: <ConfigETL />,
        },
        {
          title: t('pipeline:create.reporting'),
          content: <Reporting />,
        },
        {
          title: t('pipeline:create.reviewLaunch'),
          content: <ReviewAndLaunch />,
        },
      ]}
    />
  );
};

const CreatePipeline: React.FC = () => {
  const { t } = useTranslation();
  const breadcrumbItems = [
    {
      text: t('breadCrumb.name'),
      href: '/',
    },
    {
      text: t('breadCrumb.pipelines'),
      href: '/',
    },
    {
      text: t('breadCrumb.createPipeline'),
      href: '/',
    },
  ];

  return (
    <AppLayout
      content={<Content />}
      headerSelector="#header"
      breadcrumbs={<CustomBreadCrumb breadcrumbItems={breadcrumbItems} />}
      navigation={<Navigation activeHref="/pipelines" />}
      // navigationOpen={false}
    />
  );
};

export default CreatePipeline;
