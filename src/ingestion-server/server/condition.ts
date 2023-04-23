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

interface ConditionConfigItem {
  condition: CfnCondition;
  serverProps: object;
}

export function createCommonConditions(
  scope: Construct,
  props: {
    enableApplicationLoadBalancerAccessLogParam: CfnParameter;
    logS3BucketParam: CfnParameter;
    logS3PrefixParam: CfnParameter;
    notificationsTopicArnParam: CfnParameter;
    protocolParam: CfnParameter;
    domainNameParam: CfnParameter;
    certificateArnParam: CfnParameter;
    enableAuthenticationParam: CfnParameter;
    authenticationSecretArnParam: CfnParameter;
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

  // ALB enableAuthentication
  const enableAuthenticationCondition = new CfnCondition(
    scope,
    'enableAuthenticationCondition',
    {
      expression: Fn.conditionEquals(
        props.enableAuthenticationParam.valueAsString,
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

  const protocolHttpsConditionNeg = createNegCondition(
    scope,
    'protocolHttpsConditionNeg',
    protocolHttpsCondition,
  );

  const enableAccessLogConditionNeg = createNegCondition(
    scope,
    'enableAccessLogConditionNeg',
    enableAccessLogCondition,
  );

  const enableAuthenticationConditionNeg = createNegCondition(
    scope,
    'enableAuthenticationConditionNeg',
    enableAuthenticationCondition,
  );

  const notificationsTopicArnConditionNeg = createNegCondition(
    scope,
    'notificationsTopicArnConditionNeg',
    notificationsTopicArnCondition,
  );

  const conditionServerPopsConfig: ConditionConfigItem[] = [
    {
      condition: protocolHttpsCondition,
      serverProps: {
        protocol: 'HTTPS',
        domainName: props.domainNameParam.valueAsString,
        certificateArn: props.certificateArnParam.valueAsString,
      },
    },

    {
      condition: protocolHttpsConditionNeg,
      serverProps: {
        protocol: 'HTTP',
      },
    },

    {
      condition: enableAccessLogCondition,
      serverProps: {
        enableApplicationLoadBalancerAccessLog: 'Yes',
        logBucketName: props.logS3BucketParam.valueAsString,
        logPrefix: props.logS3PrefixParam.valueAsString,
      },
    },

    {
      condition: enableAccessLogConditionNeg,
      serverProps: {
        enableApplicationLoadBalancerAccessLog: 'No',
        logBucketName: undefined,
        logPrefix: undefined,
      },
    },

    {
      condition: enableAuthenticationCondition,
      serverProps: {
        enableAuthentication: 'Yes',
        authenticationSecretArn: props.authenticationSecretArnParam.valueAsString,
      },
    },

    {
      condition: enableAuthenticationConditionNeg,
      serverProps: {
        enableAuthentication: 'No',
        authenticationSecretArn: undefined,
      },
    },

    {
      condition: notificationsTopicArnCondition,
      serverProps: {
        notificationsTopicArn: props.notificationsTopicArnParam.valueAsString,
      },
    },

    {
      condition: notificationsTopicArnConditionNeg,
      serverProps: {
        notificationsTopicArn: undefined,
      },
    },
  ];

  const conditionBits = [
    { 1: enableAccessLogCondition, 0: enableAccessLogConditionNeg },
    { 1: protocolHttpsCondition, 0: protocolHttpsConditionNeg },
    {
      1: notificationsTopicArnCondition,
      0: notificationsTopicArnConditionNeg,
    },
    {
      1: enableAuthenticationCondition,
      0: enableAuthenticationConditionNeg,
    },
  ];

  //Need to filter out the cases that both http protocol and enable authentication.
  const filterOutConditionBits = ['0001', '1001', '0011', '1011'];

  const commonConditions = genAllConditions('C', conditionBits, filterOutConditionBits);

  return {
    serverPropsConfig: conditionServerPopsConfig,
    conditions: commonConditions,
  };
}

export function createMskConditions(
  scope: Construct,
  props: {
    mskClusterNameParam: CfnParameter;
    mskSecurityGroupIdParam: CfnParameter;
    kafkaBrokersParam: CfnParameter;
    kafkaTopicParam: CfnParameter;
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

  const mskConditionServerPopsConfig = [
    {
      condition: mskSecurityGroupIdCondition,
      serverProps: {

        mskSecurityGroupId: props.mskSecurityGroupIdParam.valueAsString,

      },
    },

    {
      condition: mskSecurityGroupIdConditionNeg,
      serverProps: {

        mskSecurityGroupId: undefined,

      },
    },

    {
      condition: mskClusterNameCondition,
      serverProps: {

        mskClusterName: props.mskClusterNameParam.valueAsString,

      },
    },

    {
      condition: mskClusterNameConditionNeg,
      serverProps: {

        mskClusterName: undefined,

      },
    },
  ];

  const conditionBits = [
    { 1: mskClusterNameCondition, 0: mskClusterNameConditionNeg },
    { 1: mskSecurityGroupIdCondition, 0: mskSecurityGroupIdConditionNeg },
  ];

  const mskConditions = genAllConditions('M', conditionBits, []);

  return {
    serverPropsConfig: mskConditionServerPopsConfig,
    conditions: mskConditions,
  };
}

export function createKinesisConditions(props: {
  provisionedStackStream: Stream;
  onDemandStackStream: Stream;
  provisionedStackCondition: CfnCondition;
  onDemandStackCondition: CfnCondition;
}) {
  const kinesisConditionServerPopsConfig = [
    {
      condition: props.onDemandStackCondition,
      serverProps: {
        kinesisDataStreamArn: props.onDemandStackStream.streamArn,
      },
    },

    {
      condition: props.provisionedStackCondition,
      serverProps: {
        kinesisDataStreamArn: props.provisionedStackStream.streamArn,
      },
    },
  ];

  const kinesisConditions: GenAllConditionsRetValueItem[] = [
    {
      conditions: [props.onDemandStackCondition],
      binStr: '1',
      name: 'K1',
    },
    {
      conditions: [props.provisionedStackCondition],
      binStr: '2',
      name: 'K2',
    },
  ];
  return {
    serverPropsConfig: kinesisConditionServerPopsConfig,
    conditions: kinesisConditions,
  };
}

interface ConditionsAndServerPropsConfig {
  serverPropsConfig: { condition: CfnCondition; serverProps: any }[];
  conditions: GenAllConditionsRetValueItem[];
}

export function mergeConditionsAndServerPropsConfig(
  specific: ConditionsAndServerPropsConfig,
  common: ConditionsAndServerPropsConfig,
): ConditionsAndServerPropsConfig {
  const serverPropsConfig = [
    ...specific.serverPropsConfig,
    ...common.serverPropsConfig,
  ];
  const allConditions: GenAllConditionsRetValueItem[] = [];
  for (const sc of specific.conditions) {
    for (const cc of common.conditions) {
      allConditions.push({
        conditions: [... sc.conditions, ... cc.conditions],
        binStr: sc.binStr + cc.binStr,
        name: sc.name + cc.name,
      });
    }
  }
  return {
    serverPropsConfig,
    conditions: allConditions,
  };
}

export function getServerPropsByCondition(
  conditions: CfnCondition[],
  conditionConfigs: ConditionConfigItem[],
) {
  let conditionsProps: object = {};
  for (const c of conditions) {
    const cConfig = conditionConfigs.filter((cc) => cc.condition == c)[0];
    const serverProps = cConfig.serverProps;
    type ObjectKey = keyof typeof serverProps;
    for (const k of Object.keys(serverProps)) {
      const objK = k as ObjectKey;
      const objV = serverProps[objK];
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
  filterOut: string[],
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
        throw new Error(
          `Cannot find condition in the input conditions[${j}][${bi}]`,
        );
      }
    }
    if (!filterOut.includes(binStr)) {
      retConditions.push({
        conditions: conditionsForBinStr,
        binStr,
        name: `${idPrefix}${binStr}`,
      });
    }
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
