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
import { Construct } from 'constructs';

interface ConditionConfigItem {
  condition: CfnCondition;
  serverPops: object;
}

export function createStackConditions(
  scope: Construct,
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

  // logS3BucketNameCondition
  const logS3BucketNameCondition = new CfnCondition(
    scope,
    'logS3BucketNameCondition',
    {
      expression: Fn.conditionNot(
        Fn.conditionEquals(props.logS3BucketParam.valueAsString, ''),
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

  const enableAccessLogConditionNeg = createNegCondition(
    scope,
    'enableAccessLogConditionNeg',
    enableAccessLogCondition,
  );
  const logS3BucketNameConditionNeg = createNegCondition(
    scope,
    'logS3BucketNameConditionNeg',
    logS3BucketNameCondition,
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
      },
    },

    {
      condition: enableAccessLogConditionNeg,
      serverPops: {
        enableApplicationLoadBalancerAccessLog: 'No',
      },
    },

    {
      condition: logS3BucketNameCondition,
      serverPops: {
        logBucketName: props.logS3BucketParam.valueAsString,
      },
    },

    {
      condition: logS3BucketNameConditionNeg,
      serverPops: {
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
  ];

  const conditionBits = [
    { 1: sinkToKafkaCondition, 0: sinkToKafkaConditionNeg },
    { 1: mskSecurityGroupIdCondition, 0: mskSecurityGroupIdConditionNeg },
    { 1: mskClusterNameCondition, 0: mskClusterNameConditionNeg },

    { 1: enableAccessLogCondition, 0: enableAccessLogConditionNeg },
    { 1: logS3BucketNameCondition, 0: logS3BucketNameConditionNeg },

    { 1: protocolHttpsCondition, 0: protocolHttpsConditionNeg },

    {
      1: notificationsTopicArnCondition,
      0: notificationsTopicArnConditionNeg,
    },
  ];

  const allConditions = genAllConditions(conditionBits);

  const mskConditions = allConditions
    .filter((c) => c.binStr.charAt(0) == '1')
    // ignore: enableAccessLog=true, logS3BucketName=false,
    .filter((c) => !(c.binStr.charAt(3) == '1' && c.binStr.charAt(4) == '0'));

  return {
    conditionServerPopsConfig,
    allConditions,
    mskConditions,
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

function createNegCondition(scope: Construct, id: string, condition: CfnCondition) {
  const notCondition = new CfnCondition(scope, id, {
    expression: Fn.conditionNot(condition),
  });
  return notCondition;
}

interface GenAllConditionsRetValueItem {
  conditions: CfnCondition[];
  binStr: string;
}

function genAllConditions(
  conditions: { 1: CfnCondition; 0: CfnCondition }[],
): GenAllConditionsRetValueItem[] {
  const len = conditions.length;
  const condCount = Math.pow(2, len);

  const retConditions: {
    conditions: CfnCondition[];
    binStr: string;
  }[] = [];
  for (let i = 0; i < condCount; i++) {
    const binStr = numberToBinaryStr(i, len);
    const conditionsForBinStr: CfnCondition[] = [];
    for (let j = 0; j < len; j++) {
      const bi = binStr.charAt(j) == '0' ? 0 : 1;
      conditionsForBinStr.push(conditions[j][bi]);
    }
    retConditions.push({ conditions: conditionsForBinStr, binStr });
  }
  return retConditions;
}

function numberToBinaryStr(n: number, len: number) {
  let binStr = (Math.pow(2, len) + n).toString(2);
  binStr = binStr.substring(1);
  return binStr;
}
