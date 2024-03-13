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
import {
  ElasticLoadBalancingV2Client,
  DescribeRulesCommand,
  CreateRuleCommand,
  DeleteRuleCommand,
  ModifyListenerCommand,
  ModifyRuleCommand,
  Rule,
  RuleCondition,
  ActionTypeEnum,
  AuthenticateCognitoActionConditionalBehaviorEnum,
  DeleteListenerCommand,
  DescribeListenersCommand,
  CreateListenerCommand,
  ProtocolEnum,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { CloudFormationCustomResourceEvent, CloudFormationCustomResourceUpdateEvent, Context } from 'aws-lambda';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';

const region = process.env.AWS_REGION!;

const albClient = new ElasticLoadBalancingV2Client({
  ...aws_sdk_client_common_config,
  region,
});

const secretsManagerClient = new SecretsManagerClient({
  ...aws_sdk_client_common_config,
  region,
});

interface ResourcePropertiesType {
  ServiceToken: string;
  appIds: string;
  clickStreamSDK: string;
  targetGroupArn: string;
  loadBalancerArn: string;
  certificateArn: string;
  authenticationSecretArn: string;
  endpointPath: string;
  domainName: string;
  protocol: string;
}

interface HandleClickStreamSDKInput {
  readonly appIds: string;
  readonly listenerArn: string;
  readonly requestType: string;
  readonly protocol: string;
  readonly endpointPath: string;
  readonly domainName: string;
  readonly authenticationSecretArn: string;
  readonly targetGroupArn: string;
}

interface HandleUpdateInput {
  readonly loadBalancerArn: string;
  readonly listenerArn: string;
  readonly protocol: string;
  readonly endpointPath: string;
  readonly hostHeader: string;
  readonly authenticationSecretArn: string;
  readonly targetGroupArn: string;
  readonly oldEndpointPath: string;
  readonly oldHostHeader: string;
  readonly oldAuthenticationSecretArn: string;
}

interface HandleCreateInput {
  readonly protocol: string;
  readonly endpointPath: string;
  readonly domainName: string;
  readonly authenticationSecretArn: string;
  readonly targetGroupArn: string;
  readonly loadBalancerArn: string;
  readonly certificateArn: string;
}

type ResourceEvent = CloudFormationCustomResourceEvent;

export const handler = async (event: ResourceEvent, context: Context) => {
  try {
    await _handler(event, context);
    logger.info('=== complete ===');
    return;
  } catch (e: any) {
    logger.error(e);
    throw e;
  }
};

async function _handler(
  event: ResourceEvent,
  context: Context,
) {
  const props = event.ResourceProperties as ResourcePropertiesType;

  let requestType = event.RequestType;
  logger.info('functionName: ' + context.functionName);

  const appIds = props.appIds;
  const clickStreamSDK = props.clickStreamSDK;
  const targetGroupArn = props.targetGroupArn;
  const authenticationSecretArn = props.authenticationSecretArn;
  const endpointPath = props.endpointPath;
  const domainName = props.domainName;
  const certificateArn = props.certificateArn;
  const protocol = props.protocol;
  const loadBalancerArn = props.loadBalancerArn;
  let listenerArn = '';
  if (requestType === 'Create') {
    listenerArn = await handleCreate( {
      protocol,
      endpointPath,
      domainName,
      authenticationSecretArn,
      targetGroupArn,
      loadBalancerArn,
      certificateArn,
    });
  }

  if (requestType === 'Update') {
    const oldProps = (event as CloudFormationCustomResourceUpdateEvent).OldResourceProperties as ResourcePropertiesType;
    const oldProtocol = oldProps.protocol;
    const oldTargetGroupArn = oldProps.targetGroupArn;
    const oldLoadbalancerArn = oldProps.loadBalancerArn;
    const oldCertificateArn = oldProps.certificateArn;
    const oldEndpointPath = oldProps.endpointPath;
    const oldDomainName = oldProps.domainName;
    const oldAuthenticationSecretArn = oldProps.authenticationSecretArn;

    if (protocol !== oldProtocol
      || targetGroupArn !== oldTargetGroupArn
      || loadBalancerArn !== oldLoadbalancerArn
      || certificateArn !== oldCertificateArn
    ) {
      listenerArn = await updateListener(oldLoadbalancerArn, protocol, targetGroupArn, loadBalancerArn, certificateArn);

      await createDefaultForwardRule(
        listenerArn,
        props.protocol,
        props.endpointPath,
        props.domainName,
        props.authenticationSecretArn,
        props.targetGroupArn,
      );

      if (props.authenticationSecretArn && props.authenticationSecretArn.length > 0) {
        await createAuthLogindRule(props.authenticationSecretArn, listenerArn);
      }
    } else {
      listenerArn = await getListenerArnFromLoadBalancer(loadBalancerArn);
      if (!listenerArn) {
        throw new Error('No listener found for load balancer: ' + loadBalancerArn);
      }
      await handleUpdateRules({
        listenerArn,
        loadBalancerArn,
        protocol,
        endpointPath,
        hostHeader: domainName,
        authenticationSecretArn,
        targetGroupArn,
        oldEndpointPath,
        oldHostHeader: oldDomainName,
        oldAuthenticationSecretArn,
      });
    }
  }

  if (clickStreamSDK === 'Yes' && requestType !== 'Delete' ) {
    await handleClickStreamSDK({ appIds, requestType, listenerArn, protocol, endpointPath, domainName, authenticationSecretArn, targetGroupArn });
  }

  if (requestType !== 'Delete') {
    // set default rules
    await modifyFallbackRule(listenerArn);
  }

  if (requestType == 'Delete') {
    logger.info('Delete Listener rules');
    listenerArn = await getListenerArnFromLoadBalancer(loadBalancerArn);
    const describeRulesCommand = new DescribeRulesCommand({
      ListenerArn: listenerArn,
    });
    const allAlbRulesResponse = await albClient.send(describeRulesCommand);
    const removeRules: Rule[] = allAlbRulesResponse.Rules?.filter(rule => !rule.IsDefault) || [];

    await deleteRules(removeRules);

    await deleteListener(loadBalancerArn);
  }
}

async function handleCreate(
  props: HandleCreateInput,
) {
  const listenerArn = await createListeners(props.protocol, props.targetGroupArn, props.loadBalancerArn, props.certificateArn);

  await createDefaultForwardRule(
    listenerArn,
    props.protocol,
    props.endpointPath,
    props.domainName,
    props.authenticationSecretArn,
    props.targetGroupArn,
  );

  if (props.authenticationSecretArn && props.authenticationSecretArn.length > 0) {
    await createAuthLogindRule(props.authenticationSecretArn, listenerArn);
  }

  return listenerArn;
}

async function updateListener(
  oldLoadbalancerArn: string,
  protocol: string,
  targetGroupArn: string,
  loadBalancerArn: string,
  certificateArn: string,
) {
  // delete old listener
  await deleteListener(oldLoadbalancerArn);
  // create new listener
  const listenerArn = await createListeners(protocol, targetGroupArn, loadBalancerArn, certificateArn);
  return listenerArn;
}

async function getListenerArnFromLoadBalancer(
  loadBalancerArn: string,
) {
  const describeListenersCommand = new DescribeListenersCommand({ LoadBalancerArn: loadBalancerArn });
  const listenersResponse = await albClient.send(describeListenersCommand);
  if (listenersResponse && listenersResponse.Listeners && listenersResponse.Listeners.length > 0) {
    const mainListener = listenersResponse.Listeners!.find(listener => listener.DefaultActions![0].Type !== ActionTypeEnum.REDIRECT);
    if (mainListener) {
      return mainListener.ListenerArn!;
    }
  }
  return '';
}

async function createListeners(
  protocol: string,
  targetGroupArn: string,
  loadBalancerArn: string,
  certificateArn: string,
) {
  const httpPort = 80;
  const httpsPort = 443;
  let listenerArn = '';

  if (protocol === 'HTTPS') {
    const createListenerCommand = new CreateListenerCommand({
      DefaultActions: [
        {
          Type: ActionTypeEnum.FORWARD,
          TargetGroupArn: targetGroupArn,
        },
      ],
      LoadBalancerArn: loadBalancerArn,
      Certificates: [
        {
          CertificateArn: certificateArn,
        },
      ],
      SslPolicy: 'ELBSecurityPolicy-TLS-1-2-2017-01',
      Port: httpsPort,
      Protocol: ProtocolEnum.HTTPS,
    });
    const createListenerResponse = await albClient.send(createListenerCommand);
    listenerArn = createListenerResponse.Listeners![0].ListenerArn!;

    // create redirect listener
    const createRedirectListenerCommand = new CreateListenerCommand({
      DefaultActions: [
        {
          Type: ActionTypeEnum.REDIRECT,
          RedirectConfig: {
            StatusCode: 'HTTP_301',
            Protocol: 'HTTPS',
            Port: httpsPort.toString(),
          },
        },
      ],
      LoadBalancerArn: loadBalancerArn,
      Port: httpPort,
      Protocol: ProtocolEnum.HTTP,
    });
    await albClient.send(createRedirectListenerCommand);

  } else {
    const createListenerCommand = new CreateListenerCommand({
      DefaultActions: [
        {
          Type: ActionTypeEnum.FORWARD,
          TargetGroupArn: targetGroupArn,
        },
      ],
      LoadBalancerArn: loadBalancerArn,
      Port: httpPort,
      Protocol: ProtocolEnum.HTTP,
    });
    const createListenerResponse = await albClient.send(createListenerCommand);
    listenerArn = createListenerResponse.Listeners![0].ListenerArn!;
  }
  return listenerArn;
}

async function deleteListener(
  loadBalancerArn: string,
) {
  const describeListenersCommand = new DescribeListenersCommand({ LoadBalancerArn: loadBalancerArn });
  const oldListenersResponse = await albClient.send(describeListenersCommand);
  if (oldListenersResponse && oldListenersResponse.Listeners && oldListenersResponse.Listeners.length > 0) {
    oldListenersResponse.Listeners.forEach(async (listener) => {
      const listenerArn = listener.ListenerArn;
      const deleteListenerCommand = new DeleteListenerCommand({ ListenerArn: listenerArn });
      await albClient.send(deleteListenerCommand);
      logger.info('Deleting old listener: ' + listenerArn);
    });
  }
  await waitForListenerDeletion(loadBalancerArn);
}

async function waitForListenerDeletion(
  loadBalancerArn: string,
  maxAttempts = 20, delay = 15000) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts++;
    const describeListenersCommand = new DescribeListenersCommand({ LoadBalancerArn: loadBalancerArn });
    const oldListenersResponse = await albClient.send(describeListenersCommand);
    if (oldListenersResponse && oldListenersResponse.Listeners && oldListenersResponse.Listeners.length > 0) {
      console.log('Listener has been successfully deleted.');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(`Listener deletion was not confirmed within the expected time frame, loadBalancerArn: ${loadBalancerArn}`);
}

async function handleUpdateRules(
  inputPros: HandleUpdateInput,
) {
  if (inputPros.authenticationSecretArn !== inputPros.oldAuthenticationSecretArn) {
    await deleteAllRules(inputPros.listenerArn);
    // create new rules
    await createDefaultForwardRule(
      inputPros.listenerArn,
      inputPros.protocol,
      inputPros.endpointPath,
      inputPros.hostHeader,
      inputPros.authenticationSecretArn,
      inputPros.targetGroupArn,
    );

    if (inputPros.authenticationSecretArn && inputPros.authenticationSecretArn.length > 0) {
      await createAuthLogindRule(inputPros.authenticationSecretArn, inputPros.listenerArn);
    }
  } else {
    if (inputPros.endpointPath !== inputPros.oldEndpointPath || inputPros.hostHeader !== inputPros.oldHostHeader) {
      await updateEndpointPathAndHostHeader(
        inputPros.listenerArn,
        inputPros.endpointPath,
        inputPros.hostHeader,
        inputPros.oldEndpointPath,
        inputPros.protocol,
      );
    }
  }
}

async function deleteAllRules(listenerArn: string) {
  const describeRulesCommand = new DescribeRulesCommand({
    ListenerArn: listenerArn,
  });
  const allAlbRulesResponse = await albClient.send(describeRulesCommand);
  const allAlbRules: Rule[] = allAlbRulesResponse.Rules?.filter(rule => !rule.IsDefault) || [];
  await deleteRules(allAlbRules);
}

async function updateEndpointPathAndHostHeader(
  listenerArn: string,
  endpointPath: string,
  hostHeader: string,
  oldEndpointPath: string,
  protocol: string,
) {
  const allExistingPathPatternRules = await getExistingRulesByEndpointPath(listenerArn, oldEndpointPath);
  if (!allExistingPathPatternRules) return;
  for (const rule of allExistingPathPatternRules) {
    if (!rule.Conditions) continue;
    const modifyCommand = new ModifyRuleCommand({
      RuleArn: rule.RuleArn,
      Conditions: [
        ...generateBaseForwardConditions(protocol, endpointPath, hostHeader),
        ...rule.Conditions.filter((condition) => condition.Field !== 'path-pattern' && condition.Field !== 'host-header'),
      ],
    });
    await albClient.send(modifyCommand);
  }
}

async function handleClickStreamSDK(input: HandleClickStreamSDKInput) {
  const shouldDeleteRules = [];
  //get appId list and remove empty appId
  const appIdArray = input.appIds.split(',').map((appId) => {
    return appId.trim();
  }).filter((item) => item !== '');

  if (input.requestType === 'Create' || input.requestType === 'Update') {
    if (appIdArray.length > 0) {
      await createAppIdRules(
        input.listenerArn,
        appIdArray,
        input.protocol,
        input.endpointPath,
        input.domainName,
        input.authenticationSecretArn,
        input.targetGroupArn,
      );
    }
  }

  if (input.requestType === 'Update') {
    // check existing rules, and delete not need rules
    const deleteAppIdRules = await getDeleteAppIdRules(appIdArray, input.listenerArn);
    shouldDeleteRules.push(...deleteAppIdRules);
  }

  const { fixedResponseRules, defaultActionRules } = await getFixedResponseAndDefaultActionRules(input.listenerArn);
  if (input.appIds.length > 0) {
    // Remove fixedRepsonseRule and defalut forward rule and action if existing
    shouldDeleteRules.push(...fixedResponseRules);
    shouldDeleteRules.push(...defaultActionRules);
  }

  if (input.appIds.length === 0) {
    // Create fixedRepsonseRule and defalut forward rule and action if not existing
    if (fixedResponseRules.length === 0) {
      await createFixedResponseRule(input.listenerArn);
    }
    if (defaultActionRules.length === 0) {
      await createDefaultForwardRule(
        input.listenerArn,
        input.protocol,
        input.endpointPath,
        input.domainName,
        input.authenticationSecretArn,
        input.targetGroupArn,
      );
    }
  }
  // delete rules
  await deleteRules(shouldDeleteRules);
}

async function deleteRules(rules: Rule[]) {

  for (const rule of rules) {
    const deleteRuleInput = {
      RuleArn: rule.RuleArn,
    };
    const command = new DeleteRuleCommand(deleteRuleInput);
    await albClient.send(command);
  }
}

async function createFixedResponseRule(listenerArn: string) {
  const fixedResponseActions = [
    {
      Type: ActionTypeEnum.FIXED_RESPONSE,
      FixedResponseConfig: {
        MessageBody: 'Configuration invalid!',
        StatusCode: '400',
        ContentType: 'text/plain',
      },
    },
  ];
  const createForwardRuleCommand = new CreateRuleCommand({
    ListenerArn: listenerArn,
    Actions: fixedResponseActions,
    Conditions: [
      {
        Field: 'path-pattern',
        PathPatternConfig: {
          Values: ['/*'],
        },
      },
    ],
    Priority: 1,
  });
  await albClient.send(createForwardRuleCommand);
}

async function getFixedResponseAndDefaultActionRules(listenerArn: string) {
  const describeRulesCommand = new DescribeRulesCommand({
    ListenerArn: listenerArn,
  });
  const allAlbRulesResponse = await albClient.send(describeRulesCommand);
  const allAlbRules: Rule[] = allAlbRulesResponse.Rules?.filter(rule => !rule.IsDefault) || [];
  const fixedResponseRules = allAlbRules.filter(rule =>
    parseInt(rule.Priority!) === 1,
  );
  const defaultActionRules = allAlbRules.filter(rule =>
    parseInt(rule.Priority!) === 2,
  );
  return { fixedResponseRules, defaultActionRules };
}

async function getDeleteAppIdRules(appIdArray: Array<string>, listenerArn: string) {
  const existingAppIdRules = await getAllExistingAppIdRules(listenerArn);

  const shouldDeleteRules = existingAppIdRules.filter(rule =>
    rule.Conditions?.some(condition =>
      condition.QueryStringConfig?.Values?.some(value => {
        return value.Key === 'appId' && value.Value !== undefined && !appIdArray.includes(value.Value);
      }),
    ),
  );
  return shouldDeleteRules;
}

async function createAppIdRules(
  listenerArn: string,
  appIdArray: Array<string>,
  protocol: string,
  endpointPath: string,
  domainName: string,
  authenticationSecretArn: string,
  targetGroupArn: string,
) {
  const allExistingAppIdRules = await getAllExistingAppIdRules(listenerArn);

  const baseForwardConditions = generateBaseForwardConditions(protocol, endpointPath, domainName);
  const forwardActions = await generateForwardActions(authenticationSecretArn, targetGroupArn);
  const allPriorities = allExistingAppIdRules.map(rule => parseInt(rule.Priority!));
  const existingAppIds = getAllExistingAppIds(allExistingAppIdRules);

  for (const appId of appIdArray) {
    if (existingAppIds.includes(appId)) {
      continue; // skip to the next iteration of the loop
    }
    const priority = createPriority(allPriorities);
    const appIdConditions = generateAppIdCondition(appId);
    //@ts-ignore
    appIdConditions.push(...baseForwardConditions);
    // Create a rule just contains mustConditions
    const createRuleCommand = new CreateRuleCommand({
      ListenerArn: listenerArn,
      Actions: forwardActions,
      Conditions: appIdConditions,
      Priority: priority,
    });
    await albClient.send(createRuleCommand);
  }
}

function getAllExistingAppIds(rules: Rule[]) {
  const appIdSet = new Set<string>();
  for (const rule of rules) {
    // Check if Conditions exist
    if (rule.Conditions) {
      for (const condition of rule.Conditions) {
        getAppIdsFromCondition(condition, appIdSet);
      }
    }
  }
  return Array.from(appIdSet); // Convert Set to Array
}

function getAppIdsFromCondition(condition: RuleCondition, appIdSet: Set<string>) {
  // Check if Field is 'query-string' and QueryStringConfig and Values exist
  if (condition.Field === 'query-string' && condition.QueryStringConfig && condition.QueryStringConfig.Values) {
    for (const value of condition.QueryStringConfig.Values) {
      // Check if Key is 'appId' and Value exists
      if (value.Key === 'appId' && value.Value) {
        appIdSet.add(value.Value);
      }
    }
  }
}

async function getAllExistingAppIdRules(listenerArn: string) {
  const describeRulesCommand = new DescribeRulesCommand({
    ListenerArn: listenerArn,
  });

  const allAlbRulesResponse = await albClient.send(describeRulesCommand);
  const allAlbRules: Rule[] = allAlbRulesResponse.Rules?.filter(rule => !rule.IsDefault) || [];
  const allExistingAppIdRules = allAlbRules.filter(rule =>
    parseInt(rule.Priority!) > 3,
  );
  return allExistingAppIdRules;
}

// create a function, get all rules which contains path-pattern condition and the value equal input endpointPath
async function getExistingRulesByEndpointPath(listenerArn: string, endpointPath: string) {
  const describeRulesCommand = new DescribeRulesCommand({
    ListenerArn: listenerArn,
  });

  const allAlbRulesResponse = await albClient.send(describeRulesCommand);
  const allAlbRules: Rule[] = allAlbRulesResponse.Rules?.filter(rule => !rule.IsDefault) || [];
  const existingRules = allAlbRules.filter(rule =>
    rule.Conditions?.some(condition =>
      condition.Field === 'path-pattern' && condition.Values?.includes(endpointPath),
    ),
  );
  return existingRules;
}

async function createDefaultForwardRule(
  listenerArn: string,
  protocol: string,
  endpointPath: string,
  domainName: string,
  authenticationSecretArn: string,
  targetGroupArn: string) {
  const defaultForwardConditions = generateBaseForwardConditions(protocol, endpointPath, domainName);

  const defaultForwardActions = await generateForwardActions(authenticationSecretArn, targetGroupArn);

  const createForwardRuleCommand = new CreateRuleCommand({
    ListenerArn: listenerArn,
    Actions: defaultForwardActions,
    Conditions: defaultForwardConditions,
    Priority: 2,
  });
  await albClient.send(createForwardRuleCommand);
}

async function generateForwardActions(
  authenticationSecretArn: string,
  targetGroupArn: string) {
  const defaultForwardActions = [];
  if (authenticationSecretArn && authenticationSecretArn.length > 0) {
    // auth scenario
    // create auth forward rule
    const { issuer, userEndpoint, authorizationEndpoint, tokenEndpoint, appClientId, appClientSecret } = await getOidcInfo(authenticationSecretArn);
    // create auth forward rule
    defaultForwardActions.push(
      {
        Type: ActionTypeEnum.AUTHENTICATE_OIDC,
        Order: 1,
        AuthenticateOidcConfig: {
          Issuer: issuer,
          ClientId: appClientId,
          ClientSecret: appClientSecret,
          TokenEndpoint: tokenEndpoint,
          UserInfoEndpoint: userEndpoint,
          AuthorizationEndpoint: authorizationEndpoint,
          OnUnauthenticatedRequest: AuthenticateCognitoActionConditionalBehaviorEnum.DENY,
        },
      },
    );
  }
  defaultForwardActions.push({
    Type: ActionTypeEnum.FORWARD,
    Order: 2,
    TargetGroupArn: targetGroupArn,
  });
  return defaultForwardActions;
}

async function createAuthLogindRule(authenticationSecretArn: string, listenerArn: string) {
  const { issuer, userEndpoint, authorizationEndpoint, tokenEndpoint, appClientId, appClientSecret } = await getOidcInfo(authenticationSecretArn);
  const authLoginActions = [
    {
      Type: ActionTypeEnum.AUTHENTICATE_OIDC,
      Order: 1,
      AuthenticateOidcConfig: {
        Issuer: issuer,
        ClientId: appClientId,
        ClientSecret: appClientSecret,
        TokenEndpoint: tokenEndpoint,
        UserInfoEndpoint: userEndpoint,
        AuthorizationEndpoint: authorizationEndpoint,
        OnUnauthenticatedRequest: AuthenticateCognitoActionConditionalBehaviorEnum.AUTHENTICATE,
      },
    },
    {
      Type: ActionTypeEnum.FIXED_RESPONSE,
      Order: 2,
      FixedResponseConfig: {
        MessageBody: 'Authenticated',
        StatusCode: '200',
        ContentType: 'text/plain',
      },
    },
  ];
  // create auth login condition
  const authLoginCondition = [
    {
      Field: 'path-pattern',
      Values: ['/login'],
    },
    {
      Field: 'http-request-method',
      HttpRequestMethodConfig: {
        Values: ['GET'],
      },
    },
  ];
  const createAuthLoginRuleCommand = new CreateRuleCommand({
    ListenerArn: listenerArn,
    Actions: authLoginActions,
    Conditions: authLoginCondition,
    Priority: 3,
  });
  await albClient.send(createAuthLoginRuleCommand);
}

function generateBaseForwardConditions(protocol: string, endpointPath: string, domainName: string) {
  // create base condition
  const baseForwardCondition = [
    {
      Field: 'path-pattern',
      Values: [endpointPath],
    },
  ];
  if (protocol === 'HTTPS') {
    baseForwardCondition.push(...[
      {
        Field: 'host-header',
        Values: [domainName],
      },
    ]);
  }
  return baseForwardCondition;
}

async function modifyFallbackRule(listenerArn: string) {
  // modify default action to return 403,
  const defaultActions = [
    {
      Type: ActionTypeEnum.FIXED_RESPONSE,
      FixedResponseConfig: {
        MessageBody: 'DefaultAction: Invalid request',
        StatusCode: '403',
        ContentType: 'text/plain',
      },
    },
  ];
  const modifyListenerDefaultRuleCommand = new ModifyListenerCommand({
    DefaultActions: defaultActions,
    ListenerArn: listenerArn,
  });
  await albClient.send(modifyListenerDefaultRuleCommand);
}

async function getOidcInfo(authenticationSecretArn: string) {
  const secretParams = {
    SecretId: authenticationSecretArn,
  };
  const data = await secretsManagerClient.send(new GetSecretValueCommand(secretParams));
  const secretValue = JSON.parse(data.SecretString!);
  const issuer = secretValue.issuer;
  const userEndpoint = secretValue.userEndpoint;
  const authorizationEndpoint = secretValue.authorizationEndpoint;
  const tokenEndpoint = secretValue.tokenEndpoint;
  const appClientId = secretValue.appClientId;
  const appClientSecret = secretValue.appClientSecret;
  return { issuer, userEndpoint, authorizationEndpoint, tokenEndpoint, appClientId, appClientSecret };
}

function createPriority(allPriorities: Array<number>) {
  let priority = 4;
  while (allPriorities.includes(priority)) {
    priority++;
  }
  allPriorities.push(priority);
  return priority;
}

function generateAppIdCondition(appId: string) {
  const appIdConditions = [
    {
      Field: 'query-string',
      QueryStringConfig: {
        Values: [{
          Key: 'appId',
          Value: appId,
        }],
      },
    },
  ];
  return appIdConditions;
}