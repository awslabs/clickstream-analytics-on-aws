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
import DataProcessing from 'pages/pipelines/create/steps/DataProcessing';
import Reporting from 'pages/pipelines/create/steps/Reporting';
import { SinkType } from 'ts/const';
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

describe('Test data processing settings', () => {
  test('Should hide the redshift and quickight settings when not enable data processing', async () => {
    const pipelineData = {
      ...INIT_EXT_PIPELINE_DATA,
      enableDataProcessing: false,
    };
    const dataProcessingDom = render(
      <DataProcessing
        pipelineInfo={pipelineData}
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

    const reportingDom = render(
      <Reporting
        pipelineInfo={pipelineData}
        changeEnableReporting={() => {
          return;
        }}
        changeQuickSightSelectedUser={() => {
          return;
        }}
        changeQuickSightAccountName={() => {
          return;
        }}
        quickSightUserEmptyError={false}
      />
    );

    expect(dataProcessingDom).toBeDefined();
    expect(pipelineData).toBeDefined();
    const redshiftCheckbox =
      dataProcessingDom.container.querySelector('#test-redshift-id');
    const athenaCheckbox =
      dataProcessingDom.container.querySelector('#test-athena-id');
    expect(redshiftCheckbox).not.toBeInTheDocument();
    expect(athenaCheckbox).not.toBeInTheDocument();
    const reportingCheckbox = reportingDom.container.querySelector(
      '#test-quicksight-id'
    );
    expect(reportingCheckbox).not.toBeInTheDocument();
  });
});

describe('Test redsfhit settings', () => {
  test('Should disable quicksight when not enable redshift', async () => {
    const pipelineData = {
      ...INIT_EXT_PIPELINE_DATA,
      enableRedshift: false,
    };
    const configIngestionDom = render(
      <DataProcessing
        pipelineInfo={pipelineData}
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

    const reportingDom = render(
      <Reporting
        pipelineInfo={pipelineData}
        changeEnableReporting={() => {
          return;
        }}
        changeQuickSightSelectedUser={() => {
          return;
        }}
        changeQuickSightAccountName={() => {
          return;
        }}
        quickSightUserEmptyError={false}
      />
    );

    expect(configIngestionDom).toBeDefined();
    expect(pipelineData).toBeDefined();
    const athenaCheckbox =
      configIngestionDom.container.querySelector('#test-athena-id');
    expect(athenaCheckbox).toBeInTheDocument();
    expect(athenaCheckbox).toBeEnabled();
    const reportingCheckbox = reportingDom.container.querySelector(
      '#test-quicksight-id'
    );
    expect(reportingCheckbox).toBeInTheDocument();
    expect(reportingCheckbox).toBeDisabled();
  });

  test('Should enable athena and enable quicksight when enable redshift with emr and quicksight service available', async () => {
    const pipelineData = {
      ...INIT_EXT_PIPELINE_DATA,
      enableRedshift: true,
      serviceStatus: {
        ...INIT_EXT_PIPELINE_DATA.serviceStatus,
        EMR_SERVERLESS: true,
        QUICK_SIGHT: true,
      },
    };
    const configIngestionDom = render(
      <DataProcessing
        pipelineInfo={pipelineData}
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

    const reportingDom = render(
      <Reporting
        pipelineInfo={pipelineData}
        changeEnableReporting={() => {
          return;
        }}
        changeQuickSightSelectedUser={() => {
          return;
        }}
        changeQuickSightAccountName={() => {
          return;
        }}
        quickSightUserEmptyError={false}
      />
    );

    expect(configIngestionDom).toBeDefined();
    expect(pipelineData).toBeDefined();
    const reportingCheckbox = reportingDom.container.querySelector(
      '#test-quicksight-id'
    );
    expect(reportingCheckbox).toBeInTheDocument();
    expect(reportingCheckbox).toBeEnabled();
  });
});

describe('Test MSK kafkaConnector settings', () => {
  test('Should diable data processing and quicksight when user not select kafkaConnector and sink type is MSK', async () => {
    const pipelineData = {
      ...INIT_EXT_PIPELINE_DATA,
      ingestionServer: {
        ...INIT_EXT_PIPELINE_DATA.ingestionServer,
        sinkType: SinkType.MSK,
        sinkKafka: {
          ...INIT_EXT_PIPELINE_DATA.ingestionServer.sinkKafka,
          kafkaConnector: {
            enable: false,
          },
        },
      },
    };
    const configIngestionDom = render(
      <DataProcessing
        pipelineInfo={pipelineData}
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

    const reportingDom = render(
      <Reporting
        pipelineInfo={pipelineData}
        changeEnableReporting={() => {
          return;
        }}
        changeQuickSightSelectedUser={() => {
          return;
        }}
        changeQuickSightAccountName={() => {
          return;
        }}
        quickSightUserEmptyError={false}
      />
    );

    expect(configIngestionDom).toBeDefined();
    expect(pipelineData).toBeDefined();
    const processingToggle = configIngestionDom.container.querySelector(
      '#test-processing-id'
    );
    expect(processingToggle).toBeInTheDocument();
    expect(processingToggle).toBeDisabled();
    const reportingCheckbox = reportingDom.container.querySelector(
      '#test-quicksight-id'
    );
    expect(reportingCheckbox).toBeInTheDocument();
    expect(reportingCheckbox).toBeDisabled();
  });

  test('Should enable data processing and quicksight when user not select kafkaConnector but sink type is not MSK', async () => {
    const pipelineData = {
      ...INIT_EXT_PIPELINE_DATA,
      serviceStatus: {
        ...INIT_EXT_PIPELINE_DATA.serviceStatus,
        EMR_SERVERLESS: true,
        MSK: true,
        QUICK_SIGHT: true,
      },
      ingestionServer: {
        ...INIT_EXT_PIPELINE_DATA.ingestionServer,
        sinkType: SinkType.KDS,
        sinkKafka: {
          ...INIT_EXT_PIPELINE_DATA.ingestionServer.sinkKafka,
          kafkaConnector: {
            enable: false,
          },
        },
      },
    };
    const configIngestionDom = render(
      <DataProcessing
        pipelineInfo={pipelineData}
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

    const reportingDom = render(
      <Reporting
        pipelineInfo={pipelineData}
        changeEnableReporting={() => {
          return;
        }}
        changeQuickSightSelectedUser={() => {
          return;
        }}
        changeQuickSightAccountName={() => {
          return;
        }}
        quickSightUserEmptyError={false}
      />
    );

    expect(configIngestionDom).toBeDefined();
    expect(pipelineData).toBeDefined();
    const processingToggle = configIngestionDom.container.querySelector(
      '#test-processing-id'
    );
    expect(processingToggle).toBeInTheDocument();
    expect(processingToggle).toBeEnabled();
    const reportingCheckbox = reportingDom.container.querySelector(
      '#test-quicksight-id'
    );
    expect(reportingCheckbox).toBeInTheDocument();
    expect(reportingCheckbox).toBeEnabled();
  });
});
