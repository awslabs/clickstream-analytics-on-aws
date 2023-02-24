/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { CfnCondition, CfnParameter, Fn } from 'aws-cdk-lib';
import { IStream } from 'aws-cdk-lib/aws-kinesis';
import { Construct } from 'constructs';

interface ConditionConfigItem {
  condition: CfnCondition;
  serverPops: object;
}

export function createStackConditions(
  scope: Construct,
  kinesisStackInfo: {
    provisionedStackStream: IStream;
    onDemandStackStream: IStream;
    provisionedStackCondition: CfnCondition;
    onDemandStackCondition: CfnCondition;
  },
  props: {
    enableApplicationLoadBalancerAccessLogParam: CfnParameter;
    logS3BucketParam: CfnParameter;
    notificationsTopicArnParam: CfnParameter;
    mskSecurityGroupIdParam: CfnParameter;
    protocolParam: CfnParameter;
    sinkToKafkaParam: CfnParameter;
    kafkaBrokersParam: CfnParameter;
    kafkaTopicParam: CfnParameter;
    mskClusterNameParam: CfnParameter;
    sinkToKinesisParam: CfnParameter;
  },
) {
  // ALB enableAccessLogCondition
  const enableAccessLogCondition = new CfnCondition(
    scope,
    'enableAccessLogCondition',
    {
      expression: Fn.conditionEquals(
        props.enableApplicationLoadBalancerAccessLogParam.valueAsString,
        'Yes',
      ),
    },
  );

  // notificationsTopicArnCondition
  const notificationsTopicArnCondition = new CfnCondition(
    scope,
    'notificationsTopicArnCondition',
    {
      expression: Fn.conditionNot(
        Fn.conditionEquals(props.notificationsTopicArnParam.valueAsString, ''),
      ),
    },
  );

  // mskSecurityGroupIdCondition
  const mskSecurityGroupIdCondition = new CfnCondition(
    scope,
    'mskSecurityGroupIdCondition',
    {
      expression: Fn.conditionNot(
        Fn.conditionEquals(props.mskSecurityGroupIdParam.valueAsString, ''),
      ),
    },
  );

  // sinkToKafkaCondition
  const sinkToKafkaCondition = new CfnCondition(scope, 'sinkToKafkaCondition', {
    expression: Fn.conditionEquals(props.sinkToKafkaParam.valueAsString, 'Yes'),
  });

  // protocolHttpsCondition
  const protocolHttpsCondition = new CfnCondition(
    scope,
    'protocolHttpsCondition',
    {
      expression: Fn.conditionEquals(
        props.protocolParam.valueAsString,
        'HTTPS',
      ),
    },
  );

  // mskClusterNameCondition
  const mskClusterNameCondition = new CfnCondition(
    scope,
    'mskClusterNameCondition',
    {
      expression: Fn.conditionNot(
        Fn.conditionEquals(props.mskClusterNameParam.valueAsString, ''),
      ),
    },
  );

  // sinkToKinesisCondition
  const sinkToKinesisCondition = new CfnCondition(
    scope,
    'sinkToKinesisCondition',
    {
      expression: Fn.conditionEquals(
        props.sinkToKinesisParam.valueAsString,
        'Yes',
      ),
    },
  );

  const enableAccessLogConditionNeg = createNegCondition(
    scope,
    'enableAccessLogConditionNeg',
    enableAccessLogCondition,
  );

  const notificationsTopicArnConditionNeg = createNegCondition(
    scope,
    'notificationsTopicArnConditionNeg',
    notificationsTopicArnCondition,
  );
  const mskSecurityGroupIdConditionNeg = createNegCondition(
    scope,
    'mskSecurityGroupIdConditionNeg',
    mskSecurityGroupIdCondition,
  );

  const sinkToKafkaConditionNeg = createNegCondition(
    scope,
    'sinkToKafkaConditionNeg',
    sinkToKafkaCondition,
  );
  const protocolHttpsConditionNeg = createNegCondition(
    scope,
    'protocolHttpsConditionNeg',
    protocolHttpsCondition,
  );
  const mskClusterNameConditionNeg = createNegCondition(
    scope,
    'mskClusterNameConditionNeg',
    mskClusterNameCondition,
  );

  const sinkToKinesisConditionNeg = createNegCondition(
    scope,
    'sinkToKinesisConditionNeg',
    sinkToKinesisCondition,
  );

  const kinesisOnDemandStackCondition = kinesisStackInfo.onDemandStackCondition;
  const kinesisProvisionedStackCondition =
    kinesisStackInfo.provisionedStackCondition;


  const conditionServerPopsConfig: ConditionConfigItem[] = [
    {
      condition: protocolHttpsCondition,
      serverPops: {
        protocol: 'HTTPS',
      },
    },

    {
      condition: protocolHttpsConditionNeg,
      serverPops: {
        protocol: 'HTTP',
      },
    },

    {
      condition: enableAccessLogCondition,
      serverPops: {
        enableApplicationLoadBalancerAccessLog: 'Yes',
        logBucketName: props.logS3BucketParam.valueAsString,
      },
    },

    {
      condition: enableAccessLogConditionNeg,
      serverPops: {
        enableApplicationLoadBalancerAccessLog: 'No',
        logBucketName: undefined,
      },
    },

    {
      condition: notificationsTopicArnCondition,
      serverPops: {
        notificationsTopicArn: props.notificationsTopicArnParam.valueAsString,
      },
    },

    {
      condition: notificationsTopicArnConditionNeg,
      serverPops: {
        notificationsTopicArn: undefined,
      },
    },

    {
      condition: mskSecurityGroupIdCondition,
      serverPops: {
        kafkaSinkConfig: {
          mskSecurityGroupId: props.mskSecurityGroupIdParam.valueAsString,
        },
      },
    },

    {
      condition: mskSecurityGroupIdConditionNeg,
      serverPops: {
        kafkaSinkConfig: {
          mskSecurityGroupId: undefined,
        },
      },
    },

    {
      condition: mskClusterNameCondition,
      serverPops: {
        kafkaSinkConfig: {
          mskClusterName: props.mskClusterNameParam.valueAsString,
        },
      },
    },

    {
      condition: mskClusterNameConditionNeg,
      serverPops: {
        kafkaSinkConfig: {
          mskClusterName: undefined,
        },
      },
    },

    {
      condition: sinkToKafkaCondition,
      serverPops: {
        kafkaSinkConfig: {
          kafkaBrokers: props.kafkaBrokersParam.valueAsString,
          kafkaTopic: props.kafkaTopicParam.valueAsString,
        },
      },
    },

    {
      condition: sinkToKafkaConditionNeg,
      serverPops: {
        kafkaSinkConfig: undefined,
      },
    },

    {
      condition: kinesisProvisionedStackCondition,
      serverPops: {
        kinesisDataStreamArn: kinesisStackInfo.provisionedStackStream.streamArn,
      },
    },

    {
      condition: kinesisOnDemandStackCondition,
      serverPops: {
        kinesisDataStreamArn: kinesisStackInfo.onDemandStackStream.streamArn,
      },
    },

    {
      condition: sinkToKinesisConditionNeg,
      serverPops: {
        kinesisDataStreamArn: undefined,
      },
    },
  ];

  const conditionBits = [
    { 1: sinkToKafkaCondition, 0: sinkToKafkaConditionNeg },
    {
      1: kinesisProvisionedStackCondition,
      2: kinesisOnDemandStackCondition,
      0: sinkToKinesisConditionNeg,
    },

    { 1: enableAccessLogCondition, 0: enableAccessLogConditionNeg },

    { 1: protocolHttpsCondition, 0: protocolHttpsConditionNeg },

    {
      1: notificationsTopicArnCondition,
      0: notificationsTopicArnConditionNeg,
    },
  ];

  const mskConditionBits = [
    ...conditionBits,
    { 1: mskSecurityGroupIdCondition, 0: mskSecurityGroupIdConditionNeg },
    { 1: mskClusterNameCondition, 0: mskClusterNameConditionNeg },
  ];

  const mskConditions = genAllConditions('M', mskConditionBits).filter(
    (c) => c.binStr.charAt(0) == '1',
  );
  const kinesisConditions = genAllConditions('K', conditionBits).filter(
    (c) => c.binStr.charAt(0) == '0' && c.binStr.charAt(1) != '0',
  );

  const allConditions = [...kinesisConditions, ...mskConditions];

  return {
    conditionServerPopsConfig,
    allConditions,
  };
}

export function getServerPropsByCondition(
  conditions: CfnCondition[],
  conditionConfigs: ConditionConfigItem[],
) {
  let conditionsProps: object = {};
  for (const c of conditions) {
    const cConfig = conditionConfigs.filter((cc) => cc.condition == c)[0];
    const serverPops = cConfig.serverPops;
    type ObjectKey = keyof typeof serverPops;
    for (const k of Object.keys(serverPops)) {
      const objK = k as ObjectKey;
      const objV = serverPops[objK];
      if (typeof objV == 'string') {
        conditionsProps = {
          ...conditionsProps,
          [k]: objV,
        };
      }
      if (typeof objV == undefined || objV == undefined) {
        conditionsProps = {
          ...conditionsProps,
          [k]: undefined,
        };
      }
      if (typeof objV == 'object') {
        const existProps = conditionsProps[objK] as object;
        let newObjV;
        if (
          Object.keys(conditionsProps).includes(k) &&
          existProps == undefined
        ) {
          newObjV = undefined;
        } else {
          newObjV = { ...existProps, ...(objV as object) };
          type ObjectVKey = keyof typeof objV;
          for (const kk of Object.keys(objV)) {
            const kkKey = kk as ObjectVKey;
            const kkValue = objV[kkKey];
            newObjV = {
              ...newObjV,
              [kk]: kkValue,
            };
          }
        }

        conditionsProps = {
          ...conditionsProps,
          [k]: newObjV,
        };
      }
    }
  }
  return conditionsProps;
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

interface GenAllConditionsRetValueItem {
  conditions: CfnCondition[];
  binStr: string;
  name: string;
}

interface CfnConditionBit {
  0: CfnCondition;
  1: CfnCondition;
  2?: CfnCondition;
}

function genAllConditions(
  idPrefix: string,
  conditions: CfnConditionBit[],
): GenAllConditionsRetValueItem[] {
  const bitLen = conditions.map((x) => Object.keys(x).length - 1);
  const allConditionBits = genAllConditionBits(bitLen);
  const retConditions: {
    conditions: CfnCondition[];
    binStr: string;
    name: string;
  }[] = [];

  type ObjectIntKey = keyof CfnConditionBit;

  for (const binStr of allConditionBits) {
    const conditionsForBinStr: CfnCondition[] = [];
    for (let j = 0; j < binStr.length; j++) {
      const bi = parseInt(binStr.charAt(j)) as ObjectIntKey;
      if (conditions[j][bi]) {
        conditionsForBinStr.push(conditions[j][bi] as CfnCondition);
      } else {
        throw new Error(`Cannot find condition in the input conditions[${j}][${bi}]`);
      }
    }
    retConditions.push({
      conditions: conditionsForBinStr,
      binStr,
      name: `${idPrefix}${binStr}`,
    });
  }
  return retConditions;
}

/**
 *
 *  binLen=[1], returns [ '0', '1' ]
 *
 *  binLen=[1, 1], returns [ '00', '01', '10', '11' ]
 *
 *  binLen=[1, 1, 2], returns
                [
                 '000', '001', '002',
                 '010', '011', '012',
                 '100', '101', '102',
                 '110', '111', '112'
                ]
 *  ...
 */

function genAllConditionBits(binLen: number[]): string[] {
  if (binLen.length == 0) {
    return [];
  }
  if (binLen.length == 1) {
    const allBits: string[] = [];
    for (let i = 0; i <= binLen[0]; i++) {
      allBits.push(`${i}`);
    }
    return allBits;
  }
  const allBits = [];
  const n = binLen.shift() as number;
  for (let j = 0; j <= n; j++) {
    for (let c of genAllConditionBits([...binLen])) {
      allBits.push(`${j}${c}`);
    }
  }
  return allBits;
}
