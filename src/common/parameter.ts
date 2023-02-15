import { CfnParameter } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { KAFKA_BROKERS_PATTERN, KAFKA_TOPIC_PATTERN } from './constant';

interface ParameterProps {
  type?: string;
  description?: string;
  minLength?: number;
  default?: string;
  allowedPattern?: string;
  constraintDescription?: string;
}

export function createMskClusterNameParameter(
  scope: IConstruct,
  id: string = 'MskClusterName',
  props: ParameterProps = {},
) {
  const mskClusterNameParam = new CfnParameter(scope, id, {
    description:
      'Amazon managed streaming for apache kafka (Amazon MSK) cluster name',
    type: 'String',
    ...props,
  });
  return mskClusterNameParam;
}

export function createKafkaBrokersParameter(
  scope: IConstruct,
  id: string = 'KafkaBrokers',
  allowEmpty: boolean = false,
  props: ParameterProps = {},
) {
  let allowedPattern = `${KAFKA_BROKERS_PATTERN}`;
  if (allowEmpty) {
    allowedPattern = `(${allowedPattern})?`;
  }
  const kafkaBrokersParam = new CfnParameter(scope, id, {
    description: 'Kafka brokers string',
    type: 'String',
    allowedPattern: `^${allowedPattern}$`,
    constraintDescription: `${id} must match pattern ${allowedPattern}`,
    ...props,
  });

  return kafkaBrokersParam;
}

export function createKafkaTopicParameter(
  scope: IConstruct,
  id: string = 'KafkaTopic',
  allowEmpty: boolean = false,
  props: ParameterProps = {},
) {
  let allowedPattern = `${KAFKA_TOPIC_PATTERN}`;
  if (allowEmpty) {
    allowedPattern = `(${allowedPattern})?`;
  }

  const kafkaTopicParam = new CfnParameter(scope, id, {
    description: 'Kafka topic',
    type: 'String',
    allowedPattern: `^${allowedPattern}$`,
    constraintDescription: `KafkaTopic must match pattern ${allowedPattern}`,
    ...props,
  });
  return kafkaTopicParam;
}

export function createMskSecurityGroupIdParameter(
  scope: IConstruct,
  id: string = 'SecurityGroupId',
  allowEmpty: boolean = false,
  props: ParameterProps = {},
) {
  let allowedPattern = 'sg-[a-f0-9]+';
  if (allowEmpty) {
    allowedPattern = `(${allowedPattern})?`;
  }
  const securityGroupIdParam = new CfnParameter(scope, id, {
    description:
      'Amazon managed streaming for apache kafka (Amazon MSK) security group id',
    type: 'String',
    allowedPattern: `^${allowedPattern}$`,
    constraintDescription: `KafkaTopic must match pattern ${allowedPattern}`,
    ...props,
  });

  return securityGroupIdParam;
}
