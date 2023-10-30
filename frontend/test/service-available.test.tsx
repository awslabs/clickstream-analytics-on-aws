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

import { render } from '@testing-library/react';
import ConfigIngestion from 'pages/pipelines/create/steps/ConfigIngestion';
import DataProcessing from 'pages/pipelines/create/steps/DataProcessing';
import Reporting from 'pages/pipelines/create/steps/Reporting';
import BufferMSK from 'pages/pipelines/create/steps/buffer/BufferMSK';
import { INIT_EXT_PIPELINE_DATA } from 'ts/init';

const mockedUsedNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as any),
  useNavigate: () => mockedUsedNavigate,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: any) => key,
    i18n: {
      language: 'en',
    },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

const getServiceStatus = (data: ServiceAvailableResponse[]) => {
  const agaAvailable =
    data.find((element) => element.service === 'global-accelerator')
      ?.available || false;
  const emrAvailable =
    data.find((element) => element.service === 'emr-serverless')?.available ||
    false;
  const redshiftServerlessAvailable =
    data.find((element) => element.service === 'redshift-serverless')
      ?.available || false;
  const mskAvailable =
    data.find((element) => element.service === 'msk')?.available || false;
  const quickSightAvailable =
    data.find((element) => element.service === 'quicksight')?.available ||
    false;

  return {
    agaAvailable,
    emrAvailable,
    redshiftServerlessAvailable,
    mskAvailable,
    quickSightAvailable,
  };
};

describe('Test AGA service available', () => {
  test('Config Ingestion Rendered and AGA is not available', async () => {
    const data = [
      { service: 'global-accelerator', available: false },
      { service: 'quicksight', available: true },
      { service: 'emr-serverless', available: true },
      { service: 'redshift-serverless', available: true },
      { service: 'msk', available: true },
    ];
    const {
      agaAvailable,
      emrAvailable,
      redshiftServerlessAvailable,
      mskAvailable,
      quickSightAvailable,
    } = getServiceStatus(data);
    const configIngestionDom = render(
      <ConfigIngestion
        pipelineInfo={{
          ...INIT_EXT_PIPELINE_DATA,
          serviceStatus: {
            AGA: agaAvailable,
            EMR_SERVERLESS: emrAvailable,
            REDSHIFT_SERVERLESS: redshiftServerlessAvailable,
            MSK: mskAvailable,
            QUICK_SIGHT: quickSightAvailable,
          },
        }}
        changePublicSubnets={() => {
          return;
        }}
        changePrivateSubnets={() => {
          return;
        }}
        changeServerMin={() => {
          return;
        }}
        changeServerMax={() => {
          return;
        }}
        changeWarmSize={() => {
          return;
        }}
        changeDomainName={() => {
          return;
        }}
        changeEnableALBAccessLog={() => {
          return;
        }}
        changeEnableAGA={() => {
          return;
        }}
        changeProtocal={() => {
          return;
        }}
        changeServerEdp={() => {
          return;
        }}
        changeServerCors={() => {
          return;
        }}
        changeCertificate={() => {
          return;
        }}
        changeSSMSecret={() => {
          return;
        }}
        changeBufferType={() => {
          return;
        }}
        changeBufferS3Bucket={() => {
          return;
        }}
        changeBufferS3Prefix={() => {
          return;
        }}
        changeS3BufferSize={() => {
          return;
        }}
        changeBufferInterval={() => {
          return;
        }}
        changeSinkMaxInterval={() => {
          return;
        }}
        changeSinkBatchSize={() => {
          return;
        }}
        changeSelfHosted={() => {
          return;
        }}
        changeCreateMSKMethod={() => {
          return;
        }}
        changeSelectedMSK={() => {
          return;
        }}
        changeSecurityGroup={() => {
          return;
        }}
        changeMSKTopic={() => {
          return;
        }}
        changeKafkaBrokers={() => {
          return;
        }}
        changeKafkaTopic={() => {
          return;
        }}
        changeEnableKafkaConnector={() => {
          return;
        }}
        changeKDSProvisionType={() => {
          return;
        }}
        changeKDSShardNumber={() => {
          return;
        }}
        changeEnableALBAuthentication={() => {
          return;
        }}
        changeAckownledge={() => {
          return;
        }}
        publicSubnetError={false}
        privateSubnetError={false}
        privateSubnetDiffWithPublicError={false}
        domainNameEmptyError={false}
        domainNameFormatError={false}
        certificateEmptyError={false}
        bufferS3BucketEmptyError={false}
        acknowledgedHTTPSecurity={false}
        sinkBatchSizeError={false}
        sinkIntervalError={false}
        minCapacityError={false}
        maxCapacityError={false}
        warmPoolError={false}
        corsFormatError={false}
        secretEmptyError={false}
        mskEmptyError={false}
        topicFormatError={false}
        brokerLinkEmptyError={false}
        brokerLinkFormatError={false}
        kafkaSGEmptyError={false}
        bufferS3PrefixFormatError={false}
        bufferS3SizeFormatError={false}
        bufferS3IntervalFormatError={false}
        bufferKDSModeEmptyError={false}
        bufferKDSShardNumFormatError={false}
      />
    );

    expect(configIngestionDom).toBeDefined();
    const checkbox = configIngestionDom.container.querySelector('#test-aga-id');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeDisabled();
  });

  test('Config Ingestion Rendered and AGA is available', async () => {
    const data = [
      { service: 'global-accelerator', available: true },
      { service: 'quicksight', available: true },
      { service: 'emr-serverless', available: true },
      { service: 'redshift-serverless', available: true },
      { service: 'msk', available: true },
    ];
    const {
      agaAvailable,
      emrAvailable,
      redshiftServerlessAvailable,
      mskAvailable,
      quickSightAvailable,
    } = getServiceStatus(data);
    const configIngestionDom = render(
      <ConfigIngestion
        pipelineInfo={{
          ...INIT_EXT_PIPELINE_DATA,
          serviceStatus: {
            AGA: agaAvailable,
            EMR_SERVERLESS: emrAvailable,
            REDSHIFT_SERVERLESS: redshiftServerlessAvailable,
            MSK: mskAvailable,
            QUICK_SIGHT: quickSightAvailable,
          },
        }}
        changePublicSubnets={() => {
          return;
        }}
        changePrivateSubnets={() => {
          return;
        }}
        changeServerMin={() => {
          return;
        }}
        changeServerMax={() => {
          return;
        }}
        changeWarmSize={() => {
          return;
        }}
        changeDomainName={() => {
          return;
        }}
        changeEnableALBAccessLog={() => {
          return;
        }}
        changeEnableAGA={() => {
          return;
        }}
        changeProtocal={() => {
          return;
        }}
        changeServerEdp={() => {
          return;
        }}
        changeServerCors={() => {
          return;
        }}
        changeCertificate={() => {
          return;
        }}
        changeSSMSecret={() => {
          return;
        }}
        changeBufferType={() => {
          return;
        }}
        changeBufferS3Bucket={() => {
          return;
        }}
        changeBufferS3Prefix={() => {
          return;
        }}
        changeS3BufferSize={() => {
          return;
        }}
        changeBufferInterval={() => {
          return;
        }}
        changeSinkMaxInterval={() => {
          return;
        }}
        changeSinkBatchSize={() => {
          return;
        }}
        changeSelfHosted={() => {
          return;
        }}
        changeCreateMSKMethod={() => {
          return;
        }}
        changeSelectedMSK={() => {
          return;
        }}
        changeSecurityGroup={() => {
          return;
        }}
        changeMSKTopic={() => {
          return;
        }}
        changeKafkaBrokers={() => {
          return;
        }}
        changeKafkaTopic={() => {
          return;
        }}
        changeEnableKafkaConnector={() => {
          return;
        }}
        changeKDSProvisionType={() => {
          return;
        }}
        changeKDSShardNumber={() => {
          return;
        }}
        changeEnableALBAuthentication={() => {
          return;
        }}
        changeAckownledge={() => {
          return;
        }}
        publicSubnetError={false}
        privateSubnetError={false}
        privateSubnetDiffWithPublicError={false}
        domainNameEmptyError={false}
        domainNameFormatError={false}
        certificateEmptyError={false}
        bufferS3BucketEmptyError={false}
        acknowledgedHTTPSecurity={false}
        sinkBatchSizeError={false}
        sinkIntervalError={false}
        minCapacityError={false}
        maxCapacityError={false}
        warmPoolError={false}
        corsFormatError={false}
        secretEmptyError={false}
        mskEmptyError={false}
        topicFormatError={false}
        brokerLinkEmptyError={false}
        brokerLinkFormatError={false}
        kafkaSGEmptyError={false}
        bufferS3PrefixFormatError={false}
        bufferS3SizeFormatError={false}
        bufferS3IntervalFormatError={false}
        bufferKDSModeEmptyError={false}
        bufferKDSShardNumFormatError={false}
      />
    );

    expect(configIngestionDom).toBeDefined();
    const checkbox = configIngestionDom.container.querySelector('#test-aga-id');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeEnabled();
  });
});

describe('Test QuickSight service available', () => {
  test('Reporting Rendered and QuickSight is not available', async () => {
    const data = [
      { service: 'global-accelerator', available: true },
      { service: 'quicksight', available: false },
      { service: 'emr-serverless', available: true },
      { service: 'redshift-serverless', available: true },
      { service: 'msk', available: true },
    ];
    const {
      agaAvailable,
      emrAvailable,
      redshiftServerlessAvailable,
      mskAvailable,
      quickSightAvailable,
    } = getServiceStatus(data);
    const reportingDom = render(
      <Reporting
        pipelineInfo={{
          ...INIT_EXT_PIPELINE_DATA,
          serviceStatus: {
            AGA: agaAvailable,
            EMR_SERVERLESS: emrAvailable,
            REDSHIFT_SERVERLESS: redshiftServerlessAvailable,
            MSK: mskAvailable,
            QUICK_SIGHT: quickSightAvailable,
          },
        }}
        changeEnableReporting={() => {
          return;
        }}
        changeQuickSightAccountName={() => {
          return;
        }}
      />
    );

    expect(reportingDom).toBeDefined();
    const reportingCheckbox = reportingDom.container.querySelector(
      '#test-quicksight-id'
    );
    expect(reportingCheckbox).toBeInTheDocument();
    expect(reportingCheckbox).toBeDisabled();
  });

  test('Reporting Rendered and QuickSight is available', async () => {
    const data = [
      { service: 'global-accelerator', available: true },
      { service: 'quicksight', available: true },
      { service: 'emr-serverless', available: true },
      { service: 'redshift-serverless', available: true },
      { service: 'msk', available: true },
    ];
    const {
      agaAvailable,
      emrAvailable,
      redshiftServerlessAvailable,
      mskAvailable,
      quickSightAvailable,
    } = getServiceStatus(data);
    const reportingDom = render(
      <Reporting
        pipelineInfo={{
          ...INIT_EXT_PIPELINE_DATA,
          serviceStatus: {
            AGA: agaAvailable,
            EMR_SERVERLESS: emrAvailable,
            REDSHIFT_SERVERLESS: redshiftServerlessAvailable,
            MSK: mskAvailable,
            QUICK_SIGHT: quickSightAvailable,
          },
        }}
        changeEnableReporting={() => {
          return;
        }}
        changeQuickSightAccountName={() => {
          return;
        }}
      />
    );

    expect(reportingDom).toBeDefined();
    const reportingCheckbox = reportingDom.container.querySelector(
      '#test-quicksight-id'
    );
    expect(reportingCheckbox).toBeInTheDocument();
    expect(reportingCheckbox).toBeEnabled();
  });
});

describe('Test EMR Serverless service available', () => {
  test('Data Processing Rendered and EMR Serverless is not available', async () => {
    const data = [
      { service: 'global-accelerator', available: true },
      { service: 'quicksight', available: true },
      { service: 'emr-serverless', available: false },
      { service: 'redshift-serverless', available: true },
      { service: 'msk', available: true },
    ];
    const {
      agaAvailable,
      emrAvailable,
      redshiftServerlessAvailable,
      mskAvailable,
      quickSightAvailable,
    } = getServiceStatus(data);
    const dataProcessingDom = render(
      <DataProcessing
        pipelineInfo={{
          ...INIT_EXT_PIPELINE_DATA,
          serviceStatus: {
            AGA: agaAvailable,
            EMR_SERVERLESS: emrAvailable,
            REDSHIFT_SERVERLESS: redshiftServerlessAvailable,
            MSK: mskAvailable,
            QUICK_SIGHT: quickSightAvailable,
          },
        }}
        changeEnableDataProcessing={() => {
          return;
        }}
        changeExecutionType={() => {
          return;
        }}
        changeExecutionFixedValue={() => {
          return;
        }}
        changeExecutionFixedUnit={() => {
          return;
        }}
        changeEventFreshValue={() => {
          return;
        }}
        changeEventFreshUnit={() => {
          return;
        }}
        changeExecutionCronExp={() => {
          return;
        }}
        changeEnableRedshift={() => {
          return;
        }}
        changeSelectedRedshift={() => {
          return;
        }}
        changeSelectedRedshiftRole={() => {
          return;
        }}
        changeRedshiftExecutionDuration={() => {
          return;
        }}
        changeRedshiftExecutionUnit={() => {
          return;
        }}
        changeEnableAthena={() => {
          return;
        }}
        changeTransformPlugins={() => {
          return;
        }}
        changeEnrichPlugins={() => {
          return;
        }}
        changeRedshiftType={() => {
          return;
        }}
        changeServerlessRedshiftVPC={() => {
          return;
        }}
        changeSecurityGroup={() => {
          return;
        }}
        changeReshiftSubnets={() => {
          return;
        }}
        changeBaseCapacity={() => {
          return;
        }}
        changeUpsertUserValue={() => {
          return;
        }}
        changeUpsertUserUnit={() => {
          return;
        }}
        changeDBUser={() => {
          return;
        }}
        changeSelectedUpsertType={() => {
          return;
        }}
        changeUpsertCronExp={() => {
          return;
        }}
        changeDataLoadCronExp={() => {
          return;
        }}
        dataProcessorIntervalInvalidError={false}
        redshiftServerlessVpcEmptyError={false}
        redshiftServerlessSGEmptyError={false}
        redshiftServerlessSubnetEmptyError={false}
        redshiftServerlessSubnetInvalidError={false}
        redshiftProvisionedClusterEmptyError={false}
        redshiftProvisionedDBUserEmptyError={false}
      />
    );

    expect(dataProcessingDom).toBeDefined();
    const dataProcessingCheckbox = dataProcessingDom.container.querySelector(
      '#test-processing-id'
    );
    expect(dataProcessingCheckbox).toBeInTheDocument();
    expect(dataProcessingCheckbox).toBeDisabled();
  });

  test('Data Processing Rendered and EMR Serverless is available', async () => {
    const data = [
      { service: 'global-accelerator', available: true },
      { service: 'quicksight', available: true },
      { service: 'emr-serverless', available: true },
      { service: 'redshift-serverless', available: true },
      { service: 'msk', available: true },
    ];
    const {
      agaAvailable,
      emrAvailable,
      redshiftServerlessAvailable,
      mskAvailable,
      quickSightAvailable,
    } = getServiceStatus(data);
    const dataProcessingDom = render(
      <DataProcessing
        pipelineInfo={{
          ...INIT_EXT_PIPELINE_DATA,
          serviceStatus: {
            AGA: agaAvailable,
            EMR_SERVERLESS: emrAvailable,
            REDSHIFT_SERVERLESS: redshiftServerlessAvailable,
            MSK: mskAvailable,
            QUICK_SIGHT: quickSightAvailable,
          },
        }}
        changeEnableDataProcessing={() => {
          return;
        }}
        changeExecutionType={() => {
          return;
        }}
        changeExecutionFixedValue={() => {
          return;
        }}
        changeExecutionFixedUnit={() => {
          return;
        }}
        changeEventFreshValue={() => {
          return;
        }}
        changeEventFreshUnit={() => {
          return;
        }}
        changeExecutionCronExp={() => {
          return;
        }}
        changeEnableRedshift={() => {
          return;
        }}
        changeSelectedRedshift={() => {
          return;
        }}
        changeSelectedRedshiftRole={() => {
          return;
        }}
        changeRedshiftExecutionDuration={() => {
          return;
        }}
        changeRedshiftExecutionUnit={() => {
          return;
        }}
        changeEnableAthena={() => {
          return;
        }}
        changeTransformPlugins={() => {
          return;
        }}
        changeEnrichPlugins={() => {
          return;
        }}
        changeRedshiftType={() => {
          return;
        }}
        changeServerlessRedshiftVPC={() => {
          return;
        }}
        changeSecurityGroup={() => {
          return;
        }}
        changeReshiftSubnets={() => {
          return;
        }}
        changeBaseCapacity={() => {
          return;
        }}
        changeUpsertUserValue={() => {
          return;
        }}
        changeUpsertUserUnit={() => {
          return;
        }}
        changeDBUser={() => {
          return;
        }}
        changeSelectedUpsertType={() => {
          return;
        }}
        changeUpsertCronExp={() => {
          return;
        }}
        changeDataLoadCronExp={() => {
          return;
        }}
        dataProcessorIntervalInvalidError={false}
        redshiftServerlessVpcEmptyError={false}
        redshiftServerlessSGEmptyError={false}
        redshiftServerlessSubnetEmptyError={false}
        redshiftServerlessSubnetInvalidError={false}
        redshiftProvisionedClusterEmptyError={false}
        redshiftProvisionedDBUserEmptyError={false}
      />
    );

    expect(dataProcessingDom).toBeDefined();
    const dataProcessingCheckbox = dataProcessingDom.container.querySelector(
      '#test-processing-id'
    );
    expect(dataProcessingCheckbox).toBeInTheDocument();
    expect(dataProcessingCheckbox).toBeEnabled();
  });
});

describe('Test Redsfhift Serverless service available', () => {
  test('Data Processing Rendered and Redsfhift Serverless is not available', async () => {
    const data = [
      { service: 'global-accelerator', available: true },
      { service: 'quicksight', available: true },
      { service: 'emr-serverless', available: true },
      { service: 'redshift-serverless', available: false },
      { service: 'msk', available: true },
    ];
    const {
      agaAvailable,
      emrAvailable,
      redshiftServerlessAvailable,
      mskAvailable,
      quickSightAvailable,
    } = getServiceStatus(data);
    const dataProcessingDom = render(
      <DataProcessing
        pipelineInfo={{
          ...INIT_EXT_PIPELINE_DATA,
          serviceStatus: {
            AGA: agaAvailable,
            EMR_SERVERLESS: emrAvailable,
            REDSHIFT_SERVERLESS: redshiftServerlessAvailable,
            MSK: mskAvailable,
            QUICK_SIGHT: quickSightAvailable,
          },
        }}
        changeEnableDataProcessing={() => {
          return;
        }}
        changeExecutionType={() => {
          return;
        }}
        changeExecutionFixedValue={() => {
          return;
        }}
        changeExecutionFixedUnit={() => {
          return;
        }}
        changeEventFreshValue={() => {
          return;
        }}
        changeEventFreshUnit={() => {
          return;
        }}
        changeExecutionCronExp={() => {
          return;
        }}
        changeEnableRedshift={() => {
          return;
        }}
        changeSelectedRedshift={() => {
          return;
        }}
        changeSelectedRedshiftRole={() => {
          return;
        }}
        changeRedshiftExecutionDuration={() => {
          return;
        }}
        changeRedshiftExecutionUnit={() => {
          return;
        }}
        changeEnableAthena={() => {
          return;
        }}
        changeTransformPlugins={() => {
          return;
        }}
        changeEnrichPlugins={() => {
          return;
        }}
        changeRedshiftType={() => {
          return;
        }}
        changeServerlessRedshiftVPC={() => {
          return;
        }}
        changeSecurityGroup={() => {
          return;
        }}
        changeReshiftSubnets={() => {
          return;
        }}
        changeBaseCapacity={() => {
          return;
        }}
        changeUpsertUserValue={() => {
          return;
        }}
        changeUpsertUserUnit={() => {
          return;
        }}
        changeDBUser={() => {
          return;
        }}
        changeSelectedUpsertType={() => {
          return;
        }}
        changeUpsertCronExp={() => {
          return;
        }}
        changeDataLoadCronExp={() => {
          return;
        }}
        dataProcessorIntervalInvalidError={false}
        redshiftServerlessVpcEmptyError={false}
        redshiftServerlessSGEmptyError={false}
        redshiftServerlessSubnetEmptyError={false}
        redshiftServerlessSubnetInvalidError={false}
        redshiftProvisionedClusterEmptyError={false}
        redshiftProvisionedDBUserEmptyError={false}
      />
    );

    expect(dataProcessingDom).toBeDefined();
    const redsfhiftServerlessTile = dataProcessingDom.container.querySelector(
      '#test-redshift-serverless-id'
    );
    const redsfhiftProvisionedTile = dataProcessingDom.container.querySelector(
      '#test-redshift-provisioned-id'
    );
    expect(redsfhiftServerlessTile).toBeInTheDocument();
    expect(redsfhiftProvisionedTile).toBeInTheDocument();
    expect(redsfhiftServerlessTile).toBeDisabled();
    expect(redsfhiftProvisionedTile).toBeEnabled();
  });

  test('Data Processing Rendered and Redsfhift Serverless is available', async () => {
    const data = [
      { service: 'global-accelerator', available: true },
      { service: 'quicksight', available: true },
      { service: 'emr-serverless', available: true },
      { service: 'redshift-serverless', available: true },
      { service: 'msk', available: true },
    ];
    const {
      agaAvailable,
      emrAvailable,
      redshiftServerlessAvailable,
      mskAvailable,
      quickSightAvailable,
    } = getServiceStatus(data);
    const dataProcessingDom = render(
      <DataProcessing
        pipelineInfo={{
          ...INIT_EXT_PIPELINE_DATA,
          serviceStatus: {
            AGA: agaAvailable,
            EMR_SERVERLESS: emrAvailable,
            REDSHIFT_SERVERLESS: redshiftServerlessAvailable,
            MSK: mskAvailable,
            QUICK_SIGHT: quickSightAvailable,
          },
        }}
        changeEnableDataProcessing={() => {
          return;
        }}
        changeExecutionType={() => {
          return;
        }}
        changeExecutionFixedValue={() => {
          return;
        }}
        changeExecutionFixedUnit={() => {
          return;
        }}
        changeEventFreshValue={() => {
          return;
        }}
        changeEventFreshUnit={() => {
          return;
        }}
        changeExecutionCronExp={() => {
          return;
        }}
        changeEnableRedshift={() => {
          return;
        }}
        changeSelectedRedshift={() => {
          return;
        }}
        changeSelectedRedshiftRole={() => {
          return;
        }}
        changeRedshiftExecutionDuration={() => {
          return;
        }}
        changeRedshiftExecutionUnit={() => {
          return;
        }}
        changeEnableAthena={() => {
          return;
        }}
        changeTransformPlugins={() => {
          return;
        }}
        changeEnrichPlugins={() => {
          return;
        }}
        changeRedshiftType={() => {
          return;
        }}
        changeServerlessRedshiftVPC={() => {
          return;
        }}
        changeSecurityGroup={() => {
          return;
        }}
        changeReshiftSubnets={() => {
          return;
        }}
        changeBaseCapacity={() => {
          return;
        }}
        changeUpsertUserValue={() => {
          return;
        }}
        changeUpsertUserUnit={() => {
          return;
        }}
        changeDBUser={() => {
          return;
        }}
        changeSelectedUpsertType={() => {
          return;
        }}
        changeUpsertCronExp={() => {
          return;
        }}
        changeDataLoadCronExp={() => {
          return;
        }}
        dataProcessorIntervalInvalidError={false}
        redshiftServerlessVpcEmptyError={false}
        redshiftServerlessSGEmptyError={false}
        redshiftServerlessSubnetEmptyError={false}
        redshiftServerlessSubnetInvalidError={false}
        redshiftProvisionedClusterEmptyError={false}
        redshiftProvisionedDBUserEmptyError={false}
      />
    );

    expect(dataProcessingDom).toBeDefined();
    const redsfhiftServerlessTile = dataProcessingDom.container.querySelector(
      '#test-redshift-serverless-id'
    );
    const redsfhiftProvisionedTile = dataProcessingDom.container.querySelector(
      '#test-redshift-provisioned-id'
    );
    expect(redsfhiftServerlessTile).toBeInTheDocument();
    expect(redsfhiftProvisionedTile).toBeInTheDocument();
    expect(redsfhiftServerlessTile).toBeEnabled();
    expect(redsfhiftServerlessTile).toBeChecked();
    expect(redsfhiftProvisionedTile).toBeEnabled();
  });
});

describe('Test MSK service available', () => {
  test('Buffer MSK Rendered and MSK is not available', async () => {
    const data = [
      { service: 'global-accelerator', available: true },
      { service: 'quicksight', available: true },
      { service: 'emr-serverless', available: true },
      { service: 'redshift-serverless', available: true },
      { service: 'msk', available: false },
    ];
    const {
      agaAvailable,
      emrAvailable,
      redshiftServerlessAvailable,
      mskAvailable,
      quickSightAvailable,
    } = getServiceStatus(data);
    const configIntestionDom = render(
      <ConfigIngestion
        pipelineInfo={{
          ...INIT_EXT_PIPELINE_DATA,
          serviceStatus: {
            AGA: agaAvailable,
            EMR_SERVERLESS: emrAvailable,
            REDSHIFT_SERVERLESS: redshiftServerlessAvailable,
            MSK: mskAvailable,
            QUICK_SIGHT: quickSightAvailable,
          },
        }}
        changePublicSubnets={() => {
          return;
        }}
        changePrivateSubnets={() => {
          return;
        }}
        changeServerMin={() => {
          return;
        }}
        changeServerMax={() => {
          return;
        }}
        changeWarmSize={() => {
          return;
        }}
        changeDomainName={() => {
          return;
        }}
        changeEnableALBAccessLog={() => {
          return;
        }}
        changeEnableAGA={() => {
          return;
        }}
        changeProtocal={() => {
          return;
        }}
        changeServerEdp={() => {
          return;
        }}
        changeServerCors={() => {
          return;
        }}
        changeCertificate={() => {
          return;
        }}
        changeSSMSecret={() => {
          return;
        }}
        changeBufferType={() => {
          return;
        }}
        changeBufferS3Bucket={() => {
          return;
        }}
        changeBufferS3Prefix={() => {
          return;
        }}
        changeS3BufferSize={() => {
          return;
        }}
        changeBufferInterval={() => {
          return;
        }}
        changeSinkMaxInterval={() => {
          return;
        }}
        changeSinkBatchSize={() => {
          return;
        }}
        changeSelfHosted={() => {
          return;
        }}
        changeCreateMSKMethod={() => {
          return;
        }}
        changeSelectedMSK={() => {
          return;
        }}
        changeSecurityGroup={() => {
          return;
        }}
        changeMSKTopic={() => {
          return;
        }}
        changeKafkaBrokers={() => {
          return;
        }}
        changeKafkaTopic={() => {
          return;
        }}
        changeEnableKafkaConnector={() => {
          return;
        }}
        changeKDSProvisionType={() => {
          return;
        }}
        changeKDSShardNumber={() => {
          return;
        }}
        changeEnableALBAuthentication={() => {
          return;
        }}
        changeAckownledge={() => {
          return;
        }}
        publicSubnetError={false}
        privateSubnetError={false}
        privateSubnetDiffWithPublicError={false}
        domainNameEmptyError={false}
        domainNameFormatError={false}
        certificateEmptyError={false}
        bufferS3BucketEmptyError={false}
        acknowledgedHTTPSecurity={false}
        sinkBatchSizeError={false}
        sinkIntervalError={false}
        minCapacityError={false}
        maxCapacityError={false}
        warmPoolError={false}
        corsFormatError={false}
        secretEmptyError={false}
        mskEmptyError={false}
        topicFormatError={false}
        brokerLinkEmptyError={false}
        brokerLinkFormatError={false}
        kafkaSGEmptyError={false}
        bufferS3PrefixFormatError={false}
        bufferS3SizeFormatError={false}
        bufferS3IntervalFormatError={false}
        bufferKDSModeEmptyError={false}
        bufferKDSShardNumFormatError={false}
      />
    );
    expect(configIntestionDom).toBeDefined();
    const selectedMSKBuffer = configIntestionDom.container.querySelector(
      '#test-select-msk-buffer'
    );
    expect(selectedMSKBuffer).toBeInTheDocument();
    expect(selectedMSKBuffer).toBeDisabled();
  });

  test('Buffer MSK Rendered and MSK is available', async () => {
    const data = [
      { service: 'global-accelerator', available: true },
      { service: 'quicksight', available: true },
      { service: 'emr-serverless', available: true },
      { service: 'redshift-serverless', available: true },
      { service: 'msk', available: true },
    ];
    const {
      agaAvailable,
      emrAvailable,
      redshiftServerlessAvailable,
      mskAvailable,
      quickSightAvailable,
    } = getServiceStatus(data);
    const bufferMSKDom = render(
      <BufferMSK
        pipelineInfo={{
          ...INIT_EXT_PIPELINE_DATA,
          serviceStatus: {
            AGA: agaAvailable,
            EMR_SERVERLESS: emrAvailable,
            REDSHIFT_SERVERLESS: redshiftServerlessAvailable,
            MSK: mskAvailable,
            QUICK_SIGHT: quickSightAvailable,
          },
        }}
        changeSelfHosted={() => {
          return;
        }}
        changeCreateMSKMethod={() => {
          return;
        }}
        changeSelectedMSK={() => {
          return;
        }}
        changeMSKTopic={() => {
          return;
        }}
        changeKafkaBrokers={() => {
          return;
        }}
        changeKafkaTopic={() => {
          return;
        }}
        changeSecurityGroup={() => {
          return;
        }}
        mskEmptyError={false}
        topicFormatError={false}
        brokerLinkEmptyError={false}
        brokerLinkFormatError={false}
        kafkaSGEmptyError={false}
      />
    );
    expect(bufferMSKDom).toBeDefined();
    const selectedMSK = bufferMSKDom.container.querySelector(
      '#test-select-msk-id'
    );
    expect(selectedMSK).toBeInTheDocument();
    expect(selectedMSK).toBeEnabled();
  });
});
