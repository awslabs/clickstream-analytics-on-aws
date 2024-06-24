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

import { CfnCondition, CfnParameter, Fn } from 'aws-cdk-lib';
import { Stream } from 'aws-cdk-lib/aws-kinesis';
import { Construct } from 'constructs';
import { SINK_TYPE_MODE, ECS_INFRA_TYPE_MODE } from '../../common/model';
import {
  createNegCondition,
} from '../server/condition';

export function createS3Conditions(scope: Construct, props: {
  sinkType: string;
  ecsInfraConditions: any[];
}) {
  const s3Condition = new CfnCondition(scope, 's3Condition', {
    expression: Fn.conditionEquals(props.sinkType, SINK_TYPE_MODE.SINK_TYPE_S3),
  });
  const s3ConditionAndName: any[] = [];
  props.ecsInfraConditions.forEach((ecsInfraCondition) => {
    s3ConditionAndName.push(
      {
        conditions: [s3Condition, ecsInfraCondition.condition],
        name: `${ecsInfraCondition.name}C`,
        ecsInfraType: ecsInfraCondition.ecsInfraType,
      },
    );
  });

  return s3ConditionAndName;
}

export function createECSTypeCondition(
  scope: Construct,
  ecsInfraType: string,
) {
  const ecsEC2Condition = new CfnCondition(scope, 'ecsEC2Condition', {
    expression: Fn.conditionEquals(ecsInfraType, ECS_INFRA_TYPE_MODE.EC2),
  });
  const ecsFargateCondition = new CfnCondition(scope, 'ecsFargateCondition', {
    expression: Fn.conditionEquals(ecsInfraType, ECS_INFRA_TYPE_MODE.FARGATE),
  });
  const ecsInfraConditions = [
    {
      condition: ecsEC2Condition,
      name: 'E',
      ecsInfraType: ECS_INFRA_TYPE_MODE.EC2,
    },
    {
      condition: ecsFargateCondition,
      name: 'F',
      ecsInfraType: ECS_INFRA_TYPE_MODE.FARGATE,
    },
  ];
  return ecsInfraConditions;
}

export function createKinesisConditions(
  props: {
    provisionedStackStream: Stream;
    onDemandStackStream: Stream;
    provisionedStackCondition: CfnCondition;
    onDemandStackCondition: CfnCondition;
  },
  ecsInfraConditions: any[],
) {
  const kinesisConditionsAndProps: any[] = [];
  ecsInfraConditions.forEach((ecsInfraCondition) => {
    kinesisConditionsAndProps.push(
      {
        conditions: [props.onDemandStackCondition, ecsInfraCondition.condition],
        name: `${ecsInfraCondition.name}K1`,
        ecsInfraType: ecsInfraCondition.ecsInfraType,
        serverProps: {
          kinesisDataStreamArn: props.onDemandStackStream.streamArn,
        },
      },
      {
        conditions: [props.provisionedStackCondition, ecsInfraCondition.condition],
        name: `${ecsInfraCondition.name}K2`,
        ecsInfraType: ecsInfraCondition.ecsInfraType,
        serverProps: {
          kinesisDataStreamArn: props.provisionedStackStream.streamArn,
        },
      },
    );
  });
  return kinesisConditionsAndProps;
}

export function createMskConditions(
  scope: Construct,
  props: {
    mskClusterNameParam: CfnParameter;
    mskSecurityGroupIdParam: CfnParameter;
    kafkaBrokersParam: CfnParameter;
    kafkaTopicParam: CfnParameter;
    sinkType: string;
    ecsInfraConditions: any[];
  },
) {
  const mskClusterNameCondition = new CfnCondition(
    scope,
    'mskClusterNameCondition',
    {
      expression: Fn.conditionNot(
        Fn.conditionEquals(props.mskClusterNameParam.valueAsString, ''),
      ),
    },
  );

  const mskSecurityGroupIdCondition = new CfnCondition(
    scope,
    'mskSecurityGroupIdCondition',
    {
      expression: Fn.conditionNot(
        Fn.conditionEquals(props.mskSecurityGroupIdParam.valueAsString, ''),
      ),
    },
  );
  const mskClusterNameConditionNeg = createNegCondition(
    scope,
    'mskClusterNameConditionNeg',
    mskClusterNameCondition,
  );

  const mskSecurityGroupIdConditionNeg = createNegCondition(
    scope,
    'mskSecurityGroupIdConditionNeg',
    mskSecurityGroupIdCondition,
  );

  const mskCondition = new CfnCondition(scope, 'mskCondition', {
    expression: Fn.conditionEquals(props.sinkType, SINK_TYPE_MODE.SINK_TYPE_MSK),
  });

  const mskConditionServerPopsConfig: any[] = [];

  props.ecsInfraConditions.forEach((ecsInfraCondition) => {
    mskConditionServerPopsConfig.push(
      {
        conditions: [
          mskSecurityGroupIdCondition,
          mskClusterNameCondition,
          mskCondition,
          ecsInfraCondition.condition,
        ],
        name: `${ecsInfraCondition.name}M11`,
        ecsInfraType: ecsInfraCondition.ecsInfraType,
        serverProps: {
          mskSecurityGroupId: props.mskSecurityGroupIdParam.valueAsString,
          mskClusterName: props.mskClusterNameParam.valueAsString,
        },
      },

      {
        conditions: [
          mskSecurityGroupIdCondition,
          mskClusterNameConditionNeg,
          mskCondition,
        ],
        name: `${ecsInfraCondition.name}M10`,
        ecsInfraType: ecsInfraCondition.ecsInfraType,
        serverProps: {
          mskSecurityGroupId: props.mskSecurityGroupIdParam.valueAsString,
          mskClusterName: undefined,
        },
      },

      {
        conditions: [
          mskSecurityGroupIdConditionNeg,
          mskClusterNameCondition,
          mskCondition,
        ],
        name: `${ecsInfraCondition.name}M01`,
        ecsInfraType: ecsInfraCondition.ecsInfraType,
        serverProps: {
          mskSecurityGroupId: undefined,
          mskClusterName: props.mskClusterNameParam.valueAsString,
        },
      },

      {
        conditions: [
          mskSecurityGroupIdConditionNeg,
          mskClusterNameConditionNeg,
          mskCondition,
        ],
        name: `${ecsInfraCondition.name}M00`,
        ecsInfraType: ecsInfraCondition.ecsInfraType,
        serverProps: {
          mskSecurityGroupId: undefined,
          mskClusterName: undefined,
        },
      },
    );
  });
  return mskConditionServerPopsConfig;
}