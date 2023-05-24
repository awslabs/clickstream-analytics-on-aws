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


import { CloudWatchClient, PutDashboardCommand } from '@aws-sdk/client-cloudwatch';
import { SSMClient, Parameter } from '@aws-sdk/client-ssm';
import { CloudFormationCustomResourceEvent, Context, EventBridgeEvent } from 'aws-lambda';

import { setAlarmsAction } from './set-alarms-action';
import { logger } from '../../../common/powertools';
import { aws_sdk_client_common_config } from '../../../common/sdk-client-config';
import { AlarmsWidgetElement, MetricWidgetElement, MetricsWidgetsProps, RenderingProperties, TextWidgetElement } from '../../metrics-widgets-custom-resource';
import { DESCRIPTION_HEIGHT } from '../../settings';
import { getParameterStoreName, getPosition, listParameters } from '../../util';
import { IndexMetricsWidgetsProps } from '../set-metrics-widgets';

export interface DashboardMetricElement extends MetricWidgetElement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardTextElement extends TextWidgetElement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardAlarmsElement extends AlarmsWidgetElement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DashboardWidgetElement = DashboardMetricElement | DashboardTextElement | DashboardAlarmsElement;

const region = process.env.AWS_REGION!;
const dashboardName = process.env.DASHBOARD_NAME!;
const projectId = process.env.PROJECT_ID!;
const columnNumber = parseInt(process.env.COLUMN_NUMBER || '3');
const legendPosition = (process.env.LEGEND_POSITION || 'bottom') as 'right' | 'bottom' | 'hidden';
const snsToicArn = process.env.SNS_TOPIC_ARN!;

const ssmClient = new SSMClient({
  ...aws_sdk_client_common_config,
  region,
});
const cwClient = new CloudWatchClient({
  ...aws_sdk_client_common_config,
  region,
});


// {
//   "version": "0",
//   "id": "37431cfd-db5b-762c-4350-b9021c865c34",
//   "detail-type": "Parameter Store Change",
//   "source": "aws.ssm",
//   "account": "111111111",
//   "time": "2023-05-10T03:01:23Z",
//   "region": "us-east-1",
//   "resources": [
//     "arn:aws:ssm:us-east-1:111111111:parameter/Clickstream/metrics/test_project_007/redshiftServerless/1"
//   ],
//   "detail": {
//     "name": "/Clickstream/metrics/test_project_007/redshiftServerless/1",
//     "description": "Clickstream Metrics test_project_007",
//     "type": "String",
//     "operation": "Update"
//   }
// }

type SSMEventType = EventBridgeEvent<string, {
  name: string;
  description: string;
  type: string;
  operation: string;
}>

export const handler = async (
  event: CloudFormationCustomResourceEvent | SSMEventType,
  context: Context,
) => {
  logger.info(JSON.stringify(event));
  try {
    return await _handler(event, context);
  } catch (e: any) {
    logger.error(e);
    throw e;
  }
};

async function _handler(
  event: CloudFormationCustomResourceEvent | SSMEventType,
  context: Context,
) {

  let requestType = (event as CloudFormationCustomResourceEvent).RequestType;
  let parameterName = (event as SSMEventType).detail?.name;

  logger.info('requestType: ' + requestType);
  logger.info('parameterName: ' + parameterName);

  logger.info('functionName: ' + context.functionName);
  logger.info('region: ' + region);
  logger.info('dashboardName: ' + dashboardName);
  logger.info('projectId: ' + projectId);
  logger.info('columnNumber: ' + columnNumber);
  logger.info('snsToicArn: ' + snsToicArn);

  if (requestType == 'Delete') {
    logger.info('ignore requestType ' + requestType);
    return;
  }
  const paramPath = getParameterStoreName(projectId);

  if (parameterName && !(parameterName.startsWith(paramPath) && parameterName.endsWith('/1'))) {
    logger.info('ignore update on ' + parameterName);
    return;
  }

  const path = getParameterStoreName(projectId);

  const parameters: Parameter[] = (await listParameters(ssmClient, path)).sort((p1, p2) => {
    const pw1 = JSON.parse(p1.Value!) as IndexMetricsWidgetsProps;
    const pw2 = JSON.parse(p2.Value!) as IndexMetricsWidgetsProps;
    const oderDiff = parseInt(pw1.order + '') - parseInt(pw2.order + '');
    if (oderDiff != 0) {
      return oderDiff;
    }
    return pw1.index - pw2.index;
  });

  logger.info('sorted parameters', { parameters });


  const widgetsAll: IndexMetricsWidgetsProps[] = [];
  for (const param of parameters) {
    const widgetsProps = JSON.parse(param.Value!) as IndexMetricsWidgetsProps;

    // merge splitted widgets which have the same `name`
    const existingWidgetsProps = widgetsAll.find(wp => wp.name == widgetsProps.name);
    if (existingWidgetsProps) {
      if (existingWidgetsProps.total == widgetsProps.total) {
        existingWidgetsProps.widgets.push(...widgetsProps.widgets);
        logger.info('add to existing name=' + widgetsProps.name + ', index=' + widgetsProps.index + ' total=' + widgetsProps.total);
      } else {
        logger.info('ignore name=' + widgetsProps.name + ', index=' + widgetsProps.index + ' new total=' + widgetsProps.total);
      }
    } else {
      widgetsAll.push(widgetsProps);
      logger.info('add new name=' + widgetsProps.name + ', index=' + widgetsProps.index + ' total=' + widgetsProps.total);
    }
  }

  const dashboardWidgetsAll: DashboardWidgetElement[] = [];
  const alarmArnsAll = [];
  let startY = 0;
  for (const w of widgetsAll) {
    const alarmArns = w.widgets.filter(ww => ww.type == 'alarm')
      .flatMap(a => (a as AlarmsWidgetElement).properties.alarms);
    alarmArnsAll.push( ... alarmArns);

    const dashboardWidgets = convertMetricsWidgetsToDashboardWidgets(startY, w);
    dashboardWidgetsAll.push(...dashboardWidgets);
    // get y of last widget
    const endY = dashboardWidgets[dashboardWidgets.length - 1].y;
    startY = endY + 1;
  }

  logger.info('alarmArnsAll', { alarmArnsAll });
  await setAlarmsAction(cwClient, alarmArnsAll, snsToicArn);

  const dashboardBody = {
    start: '-PT12H',
    periodOverride: 'inherit',
    widgets: dashboardWidgetsAll,
  };

  logger.info('dashboardBody', { dashboardBody });

  const response = await cwClient.send(
    new PutDashboardCommand({
      DashboardName: dashboardName,
      DashboardBody: JSON.stringify(dashboardBody),
    }),
  );

  logger.info('response', { response });
  logger.info('PutDashboardCommand done');

  return {
    Data: {
      dashboardName,
    },
  };
}

function convertMetricsWidgetsToDashboardWidgets(startY: number, w: MetricsWidgetsProps): DashboardWidgetElement[] {
  logger.info('convertMetricsWidgetsToDashboardWidgets name=' + w.name + ', startY=' + startY);

  const widgets: DashboardWidgetElement[] = [];
  const descriptionWidget: DashboardTextElement = {
    type: 'text',
    x: 0,
    y: startY,
    width: 24,
    height: DESCRIPTION_HEIGHT,
    properties: w.description,
  };

  const textPlaceHolderWidget: TextWidgetElement = {
    type: 'text',
    properties: {
      markdown: '',
      background: 'transparent',
    },
  };
  widgets.push(descriptionWidget);

  startY = startY + DESCRIPTION_HEIGHT;

  while (w.widgets.length % columnNumber !=0) {
    w.widgets.push(textPlaceHolderWidget);
  }

  for (let i = 0; i < w.widgets.length; i++) {
    const metricsWidget = w.widgets[i];

    if (metricsWidget.type == 'metric') {


      updateMetricsWidget(metricsWidget);

      widgets.push(
        {
          ...metricsWidget,
          ...getPosition(startY, i, columnNumber),
        },
      );
    } else {
      widgets.push(
        {
          ...metricsWidget,
          ...getPosition(startY, i, columnNumber),
        },
      );
    }
  }
  return widgets;
}


/**
 *
 * 1. add properties.region, `region` is required for dashboard
 *
 * 2. Convert string type for some fields back to their origin types,
 * such as `period`, `min`, `max` to number, `visible` to boolean.
 * In parameter store, all fields are stroed as string.
 *
 * @param metricsWidget
 * @returns
 *
 */
function updateMetricsWidget(metricsWidget: MetricWidgetElement) {
  // region is required for metric
  metricsWidget.properties.region = region;

  if (metricsWidget.properties.period) {
    metricsWidget.properties.period = parseInt(metricsWidget.properties.period + '');
  }

  if (!metricsWidget.properties.legend) {
    metricsWidget.properties.legend = {
      position: legendPosition,
    };
  }

  if (metricsWidget.properties.yAxis) {
    const yAxis = metricsWidget.properties.yAxis;
    if (yAxis.left) {
      yAxis.left = {
        min: yAxis.left.min ? parseFloat(yAxis.left.min + '') : undefined,
        max: yAxis.left.max ? parseFloat(yAxis.left.max + '') : undefined,
      };
    }
    if (yAxis.right) {
      yAxis.right = {
        min: yAxis.right.min ? parseFloat(yAxis.right.min + '') : undefined,
        max: yAxis.right.max ? parseFloat(yAxis.right.max + '') : undefined,
      };
    }
  }

  const properties_metrics = metricsWidget.properties.metrics;

  for (const pm of properties_metrics) {
    const lastItem = pm[pm.length - 1];
    if (typeof lastItem == 'object') {
      const renderItem = lastItem as RenderingProperties;
      if (renderItem.period) {
        renderItem.period = parseInt(renderItem.period + '');
      }
      if (renderItem.visible + '' == 'false') {
        renderItem.visible = false;
      } else if (renderItem.visible + '' == 'true') {
        renderItem.visible = true;
      }
    }
  }
  return metricsWidget;
}

