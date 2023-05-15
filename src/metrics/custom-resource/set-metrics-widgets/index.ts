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

import { SSMClient, PutParameterCommand, DeleteParameterCommand, Tag, AddTagsToResourceCommand, ResourceTypeForTagging } from '@aws-sdk/client-ssm';
import { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { getFunctionTags } from '../../../common/lambda/tags';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { InputWidgetElement, MetricsWidgetsProps } from '../../metrics-widgets-custom-resource';
import { PARAMETERS_DESCRIPTION } from '../../settings';
import { getParameterStoreName, listParameters } from '../../util';

export interface IndexMetricsWidgetsProps extends MetricsWidgetsProps {
  index: number;
  total: number;
}

const region = process.env.AWS_REGION;
const stackId = process.env.STACK_ID!;

interface CustomResourcePropertiesType {
  readonly ServiceToken: string;
  readonly metricsWidgetsProps: MetricsWidgetsProps;
}

const ssmClient = new SSMClient({
  ...aws_sdk_client_common_config,
  region,
});


export const handler = async (event: CloudFormationCustomResourceEvent, context: Context) => {
  logger.info('event', { event });
  logger.info(context.functionName);
  try {
    return await _handler(event, context);
  } catch (e: any) {
    logger.error(e);
    throw e;
  }
};

async function _handler(event: CloudFormationCustomResourceEvent, context: Context) {
  let requestType = event.RequestType;
  logger.info('requestType: ' + requestType);

  const props = event.ResourceProperties as CustomResourcePropertiesType;
  const widgetsProps = props.metricsWidgetsProps;
  const projectId = widgetsProps.projectId;
  const name = widgetsProps.name;
  const paramName = getParameterStoreName(projectId, stackId, name);

  if (requestType == 'Delete') {

    const paramList = await listParameters(ssmClient, `${paramName}/`);
    for (const param of paramList) {
      const cmd = new DeleteParameterCommand({
        Name: param.Name,
      });
      await ssmClient.send(cmd);
      logger.info(`deleted ${param.Name}`);
    }

  } else {

    const funcTags = await getFunctionTags(context);

    logger.info('funcTags', { funcTags });

    const tags: Tag[] = [];
    for (let [key, value] of Object.entries(funcTags as any)) {
      tags.push({
        Key: key,
        Value: value as string,
      });
    }
    logger.info('tags', { tags });

    const widgetsPropsArr = splitParamValues(widgetsProps);
    for (const wp of widgetsPropsArr) {
      const paramValue = JSON.stringify(wp);
      const namePath = `${paramName}/${wp.index}`;
      const cmd = new PutParameterCommand({
        Name: namePath,
        Value: paramValue,
        Type: 'String',
        Overwrite: true,
        Description: `${PARAMETERS_DESCRIPTION} ${projectId}`,
        //Tags: tags, // tags and overwrite can't be used together.
      });
      await ssmClient.send(cmd);
      logger.info(`put ${namePath}`, { paramValue });

      // tags and overwrite can't be used together.
      // To create a parameter with tags, please remove overwrite flag.
      // To update tags for an existing parameter, please use AddTagsToResource or RemoveTagsFromResource.

      await ssmClient.send(new AddTagsToResourceCommand({
        Tags: tags,
        ResourceId: namePath,
        ResourceType: ResourceTypeForTagging.PARAMETER,
      }));
      logger.info(`add tag ${namePath}`, { tags });
    }

  }

  return {
    Data: {
      paramName,
    },
  };
}

function splitParamValues(widgetsProps: MetricsWidgetsProps): IndexMetricsWidgetsProps[] {
  logger.info('splitParamValues, input widgets lenth = ' + widgetsProps.widgets.length);
  const splitMaxLength = 5;

  const widgetsArrArr: InputWidgetElement[][] = [];
  let widgetsArr: InputWidgetElement[] = [];
  for (const w of widgetsProps.widgets) {
    widgetsArr.push(w);
    if (widgetsArr.length == splitMaxLength) {
      widgetsArrArr.push([...widgetsArr]);
      widgetsArr = [];
    }
  }

  if (widgetsArr.length > 0) {
    widgetsArrArr.push([...widgetsArr]);
  }

  const widgetsPropsArr = widgetsArrArr.map((ws, ind) => {
    return {
      ...widgetsProps,
      widgets: ws,
      index: ind + 1,
      total: widgetsArrArr.length,
    };
  }).sort((a, b) => {
    return b.index - a.index; // order by desc
  });
  logger.info('splitParamValues, return ' + widgetsPropsArr.length + ' widgetsProps');
  return widgetsPropsArr;
}
