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
import { SINK_TYPE_S3 } from '../../common/constant';

export function createS3ConditionsV2(scope: Construct, props: {
  sinkType: string;
}) {
  const s3Condition = new CfnCondition(scope, 's3Condition', {
    expression: Fn.conditionEquals(props.sinkType, SINK_TYPE_S3),
  });
  return s3Condition;
}


export function createKinesisConditionsV2(props: {
  provisionedStackStream: Stream;
  onDemandStackStream: Stream;
  provisionedStackCondition: CfnCondition;
  onDemandStackCondition: CfnCondition;
}) {
  const kinesisConditionsAndProps = [
    {
      condition: props.onDemandStackCondition,
      name: 'K1',
      serverProps: {
        kinesisDataStreamArn: props.onDemandStackStream.streamArn,
      },
    },

    {
      condition: props.provisionedStackCondition,
      name: 'K2',
      serverProps: {
        kinesisDataStreamArn: props.provisionedStackStream.streamArn,
      },
    },

  ];
  return kinesisConditionsAndProps;
}

export function createMskConditionsV2(
  scope: Construct,
  props: {
    mskClusterNameParam: CfnParameter;
    mskSecurityGroupIdParam: CfnParameter;
    kafkaBrokersParam: CfnParameter;
    kafkaTopicParam: CfnParameter;
    sinkType: string;
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
    expression: Fn.conditionEquals(props.sinkType, 'MSK'),
  });

  const mskConditionServerPopsConfig = [
    {
      conditions: [
        mskSecurityGroupIdCondition,
        mskClusterNameCondition,
        mskCondition,
      ],
      name: 'M11',
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
      name: 'M10',
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
      name: 'M01',
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
      name: 'M00',
      serverProps: {
        mskSecurityGroupId: undefined,
        mskClusterName: undefined,
      },
    },
  ];
  return mskConditionServerPopsConfig;
}

function createNegCondition(
  scope: Construct,
  id: string,
  condition: CfnCondition,
) {
  const notCondition = new CfnCondition(scope, id, {
    expression: Fn.conditionNot(condition),
  });
  return notCondition;
}
