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

import { readFileSync } from 'fs';
import { App } from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';
import { DataAnalyticsRedshiftStack } from '../../../../src/data-analytics-redshift-stack';

describe('Load data workflow', () => {
  const app = new App();
  const stack = new DataAnalyticsRedshiftStack(app, 'redshiftserverlessstack', {});
  const newServerlessTemplate = Template.fromStack(stack.nestedStacks.newRedshiftServerlessStack);
  const loadDataStepFuncDef =readFileSync(__dirname + '/load-data-stepfuncs.json', 'utf8');
  const loadDataEventSubStepFuncDef =readFileSync(__dirname + '/load-data-event-sub-stepfuncs.json', 'utf8');
  const loadDataEventParametersSubStepFuncDef =readFileSync(__dirname + '/load-data-event-parameters-sub-stepfuncs.json', 'utf8');
  const loadDataUserSubStepFuncDef =readFileSync(__dirname + '/load-data-user-sub-stepfuncs.json', 'utf8');
  const loadDataItemsSubStepFuncDef =readFileSync(__dirname + '/load-data-items-sub-stepfuncs.json', 'utf8');

  test('ClickstreamLoadDataWorkflow is created as expected', () => {
    const strCapture = new Capture();

    newServerlessTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      DefinitionString: strCapture,
      RoleArn: {
        'Fn::GetAtt': [
          'LoadDataLoadDataStateMachineRoleE680C874',
          'Arn',
        ],
      },
    });

    expect(JSON.stringify(strCapture.asObject(), undefined, 2)).toEqual(loadDataStepFuncDef);
  });

  test('ClickstreamLoadDataEventSubWorkflow is created as expected', () => {
    const strCapture = new Capture();

    newServerlessTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      DefinitionString: strCapture,
      RoleArn: {
        'Fn::GetAtt': [
          'LoadDataeventSubLoadDataStateMachineRoleB6518897',
          'Arn',
        ],
      },
    });

    expect(JSON.stringify(strCapture.asObject(), undefined, 2)).toEqual(loadDataEventSubStepFuncDef);
  });

  test('ClickstreamLoadDataEventParametersSubWorkflow is created as expected', () => {
    const strCapture = new Capture();

    newServerlessTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      DefinitionString: strCapture,
      RoleArn: {
        'Fn::GetAtt': [
          'LoadDataeventparameterSubLoadDataStateMachineRole7AD798F2',
          'Arn',
        ],
      },
    });
    expect(JSON.stringify(strCapture.asObject(), undefined, 2)).toEqual(loadDataEventParametersSubStepFuncDef);
  });

  test('ClickstreamLoadDataUserSubWorkflow is created as expected', () => {
    const strCapture = new Capture();

    newServerlessTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      DefinitionString: strCapture,
      RoleArn: {
        'Fn::GetAtt': [
          'LoadDatauserSubLoadDataStateMachineRole32ADFEE7',
          'Arn',
        ],
      },
    });
    expect(JSON.stringify(strCapture.asObject(), undefined, 2)).toEqual(loadDataUserSubStepFuncDef);
  });

  test('ClickstreamLoadDataItemsSubWorkflow is created as expected', () => {
    const strCapture = new Capture();

    newServerlessTemplate.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      DefinitionString: strCapture,
      RoleArn: {
        'Fn::GetAtt': [
          'LoadDataitemSubLoadDataStateMachineRole8DC8701B',
          'Arn',
        ],
      },
    });
    expect(JSON.stringify(strCapture.asObject(), undefined, 2)).toEqual(loadDataItemsSubStepFuncDef);
  });
});
