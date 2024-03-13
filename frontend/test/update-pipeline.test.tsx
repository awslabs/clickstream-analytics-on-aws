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
import DataProcessing from '../src/pages/pipelines/create/steps/DataProcessing';
import Reporting from '../src/pages/pipelines/create/steps/Reporting';
import { EPipelineStatus } from '../src/ts/const';
import { INIT_EXT_PIPELINE_DATA } from '../src/ts/init';
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
  initReactI18next: {
    type: '3rdParty',
    init: (i18next) => i18next,
  },
}));

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(jest.fn());
});

describe('Test update pipeline when not enable data processing or data modeling', () => {
  test('Should be disable and not check data processing and hide redshift setting when disable data processing in pipeline update', async () => {
    const pipelineData = {
      ...INIT_EXT_PIPELINE_DATA,
      enableDataProcessing: false,
      status: {
        status: EPipelineStatus.Failed,
        stackDetails: [],
      },
    };
    const dataProcessingDom = render(
      <DataProcessing
        update={true}
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
        changeDBUser={() => {
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
        transformPluginEmptyError={false}
        dataProcessorIntervalCronInvalidError={false}
        redshiftProvisionedDBUserFormatError={false}
      />
    );

    const reportingDom = render(
      <Reporting
        pipelineInfo={pipelineData}
        changeEnableReporting={() => {
          return;
        }}
        changeQuickSightAccountName={() => {
          return;
        }}
        quickSightUserEmptyError={false}
        changeQuickSightDisabled={() => {
          return;
        }}
        changeQuickSightSelectedUser={() => {
          return;
        }}
      />
    );

    expect(dataProcessingDom).toBeDefined();
    expect(pipelineData).toBeDefined();
    const processingToggle = dataProcessingDom.container.querySelector(
      '#test-processing-id'
    );
    expect(processingToggle).toBeDisabled();
    expect(processingToggle).not.toBeChecked();
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

  test('Should be disable data processing and not check redshift when disable data data modeling in pipeline update', async () => {
    const pipelineData = {
      ...INIT_EXT_PIPELINE_DATA,
      enableDataProcessing: true,
      enableRedshift: false,
      status: {
        status: EPipelineStatus.Failed,
        stackDetails: [],
      },
    };
    const dataProcessingDom = render(
      <DataProcessing
        update={true}
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
        changeDBUser={() => {
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
        transformPluginEmptyError={false}
        dataProcessorIntervalCronInvalidError={false}
        redshiftProvisionedDBUserFormatError={false}
      />
    );

    const reportingDom = render(
      <Reporting
        pipelineInfo={pipelineData}
        changeEnableReporting={() => {
          return;
        }}
        changeQuickSightAccountName={() => {
          return;
        }}
        quickSightUserEmptyError={false}
        changeQuickSightDisabled={() => {
          return;
        }}
        changeQuickSightSelectedUser={() => {
          return;
        }}
      />
    );

    expect(dataProcessingDom).toBeDefined();
    expect(pipelineData).toBeDefined();
    const processingToggle = dataProcessingDom.container.querySelector(
      '#test-processing-id'
    );
    expect(processingToggle).toBeDisabled();
    expect(processingToggle).toBeChecked();

    const redshiftCheckbox =
      dataProcessingDom.container.querySelector('#test-redshift-id');
    const athenaCheckbox =
      dataProcessingDom.container.querySelector('#test-athena-id');
    expect(redshiftCheckbox).toBeInTheDocument();
    expect(athenaCheckbox).toBeInTheDocument();
    const reportingCheckbox = reportingDom.container.querySelector(
      '#test-quicksight-id'
    );
    expect(reportingCheckbox).not.toBeInTheDocument();
  });
});
