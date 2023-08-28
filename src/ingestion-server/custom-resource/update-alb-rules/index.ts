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
import { ElasticLoadBalancingV2Client, DescribeRulesCommand, CreateRuleCommand, DeleteRuleCommand, ModifyListenerCommand, ModifyRuleCommand, Rule, RuleCondition } from '@aws-sdk/client-elastic-load-balancing-v2';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
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
  listenerArn: string;
  authenticationSecretArn: string;
  endpointPath: string;
  domainName: string;
  protocol: string;
}

interface HandleClickStreamSDKInput {
  appIds: string;
  requestType: string;
  listenerArn: string;
  protocol: string;
  endpointPath: string;
  domainName: string;
  authenticationSecretArn: string;
  targetGroupArn: string;
}

type ResourceEvent = CloudFormationCustomResourceEvent;

export const handler = async (event: ResourceEvent, context: Context) => {
  logger.info(JSON.stringify(event));
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
  const listenerArn = props.listenerArn;
  const authenticationSecretArn = props.authenticationSecretArn;
  const endpointPath = props.endpointPath;
  const domainName = props.domainName;
  const protocol = props.protocol;

  if (requestType === 'Create') {
    await handleCreate(listenerArn, protocol, endpointPath, domainName, authenticationSecretArn, targetGroupArn);
  }

  if (requestType === 'Update') {
    await handleUpdate(listenerArn, endpointPath);
  }

  if (clickStreamSDK === 'Yes') {
    await handleClickStreamSDK({appIds, requestType, listenerArn, protocol, endpointPath, domainName, authenticationSecretArn, targetGroupArn});
  }

  // set default rules
  if (requestType == 'Delete') {
    logger.info('Delete Listener rules');
    const describeRulesCommand = new DescribeRulesCommand({
      ListenerArn: listenerArn,
    });
    const allAlbRulesResponse = await albClient.send(describeRulesCommand);
    const removeRules: Rule[] = allAlbRulesResponse.Rules?.filter(rule => !rule.IsDefault) || [];

    await deleteRules(removeRules);
  }
}

async function handleCreate(
  listenerArn: string,
  protocol: string,
  endpointPath: string,
  domainName: string,
  authenticationSecretArn: string,
  targetGroupArn: string
) {
  // Create defalut forward rule and action
  await createDefaultForwardRule(listenerArn, protocol, endpointPath, domainName, authenticationSecretArn, targetGroupArn);

  if (authenticationSecretArn && authenticationSecretArn.length > 0) {
    await createAuthLogindRule(authenticationSecretArn, listenerArn);
  }

  await modifyFallbackRule(listenerArn);
}

async function handleUpdate(listenerArn: string, endpointPath: string) {
  const allExistingRules = await getAllExistingAppIdRules(listenerArn);
  for (const rule of allExistingRules) {
    if (!rule.Conditions) continue;
    const pathPatternCondition = rule.Conditions.find((condition) => condition.Field === 'path-pattern');
    if (pathPatternCondition && pathPatternCondition.Values && pathPatternCondition.Values[0] !== endpointPath) {
      const modifyCommand = new ModifyRuleCommand({
        RuleArn: rule.RuleArn,
        Actions: rule.Actions,
        Conditions: [
          {
            Field: 'path-pattern',
            Values: [endpointPath], // Update the path-pattern value
          },
          ...rule.Conditions.filter((condition) => condition.Field !== 'path-pattern'),
        ],
      });
      await albClient.send(modifyCommand);
    }
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
      await createAppIdRules(input.listenerArn, appIdArray, input.protocol, input.endpointPath, input.domainName, input.authenticationSecretArn, input.targetGroupArn);
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
      await createDefaultForwardRule(input.listenerArn, input.protocol, input.endpointPath, input.domainName, input.authenticationSecretArn, input.targetGroupArn);
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
      Type: 'fixed-response',
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
        Type: 'authenticate-oidc',
        Order: 1,
        AuthenticateOidcConfig: {
          Issuer: issuer,
          ClientId: appClientId,
          ClientSecret: appClientSecret,
          TokenEndpoint: tokenEndpoint,
          UserInfoEndpoint: userEndpoint,
          AuthorizationEndpoint: authorizationEndpoint,
          OnUnauthenticatedRequest: 'deny',
        },
      },
    );
  }
  defaultForwardActions.push({
    Type: 'forward',
    Order: 2,
    TargetGroupArn: targetGroupArn,
  });
  return defaultForwardActions;
}

async function createAuthLogindRule(authenticationSecretArn: string, listenerArn: string) {
  const { issuer, userEndpoint, authorizationEndpoint, tokenEndpoint, appClientId, appClientSecret } = await getOidcInfo(authenticationSecretArn);
  const authLoginActions = [
    {
      Type: 'authenticate-oidc',
      Order: 1,
      AuthenticateOidcConfig: {
        Issuer: issuer,
        ClientId: appClientId,
        ClientSecret: appClientSecret,
        TokenEndpoint: tokenEndpoint,
        UserInfoEndpoint: userEndpoint,
        AuthorizationEndpoint: authorizationEndpoint,
        OnUnauthenticatedRequest: 'authenticate',
      },
    },
    {
      Type: 'fixed-response',
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
      Type: 'fixed-response',
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