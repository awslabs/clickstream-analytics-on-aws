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

import { Tag } from '@aws-sdk/client-ec2';
import { logger } from './powertools';
import { ALBRegionMappingObject, BucketPrefix, PipelineStackType } from './types';
import { CPipelineResources, IPipeline } from '../model/pipeline';

function isEmpty(a: any): boolean {
  if (a === '') return true; //Verify empty string
  if (a === 'null') return true; //Verify null string
  if (a === 'undefined') return true; //Verify undefined string
  if (!a && a !== 0 && a !== '') return true; //Verify undefined and null
  if (Array.prototype.isPrototypeOf(a) && a.length === 0) return true; //Verify empty array
  if (Object.prototype.isPrototypeOf(a) && Object.keys(a).length === 0) return true; //Verify empty objects
  return false;
}

function tryToJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch (error) {
    return s;
  }
}

function getValueFromTags(tag: string, tags: Tag[]): string {
  if (!isEmpty(tags)) {
    for (let index in tags as Tag[]) {
      if (tags[index].Key === tag) {
        return tags[index].Value ?? '';
      }
    }
  }
  return '';
}

function getRegionAccount(map: ALBRegionMappingObject, region: string) {
  for (let key in map) {
    if (key === region) {
      return map[key].account;
    }
  }
  return undefined;
}

function generateRandomStr(length: number) {
  let randomString = '';
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    randomString += letters[randomIndex];
  }
  return randomString;
}

function getEmailFromRequestContext(requestContext: string | undefined) {
  let email = 'unknown';
  try {
    if (requestContext) {
      // Api Gateway pass the request context to the backend
      const context = JSON.parse(requestContext);
      email = context.authorizer.email ?? 'unknown';
    }
  } catch (err) {
    logger.warn('unknown user', { requestContext, err });
  }
  return email;
}


function getBucketPrefix(projectId: string, key: BucketPrefix, value: string | undefined): string {
  if (value === undefined || value === '' || value === '/') {
    const prefixs: Map<string, string> = new Map();
    prefixs.set(BucketPrefix.LOGS_ALB, `clickstream/${projectId}/logs/alb/`);
    prefixs.set(BucketPrefix.LOGS_KAFKA_CONNECTOR, `clickstream/${projectId}/logs/kafka-connector/`);
    prefixs.set(BucketPrefix.DATA_BUFFER, `clickstream/${projectId}/data/buffer/`);
    prefixs.set(BucketPrefix.DATA_ODS, `clickstream/${projectId}/data/ods/`);
    prefixs.set(BucketPrefix.DATA_PIPELINE_TEMP, `clickstream/${projectId}/data/pipeline-temp/`);
    prefixs.set(BucketPrefix.KAFKA_CONNECTOR_PLUGIN, `clickstream/${projectId}/runtime/ingestion/kafka-connector/plugins/`);
    return prefixs.get(key) ?? '';
  }
  if (!value.endsWith('/')) {
    return `${value}/`;
  }
  return value;
}

function getStackName(pipelineId: string, key: PipelineStackType, sinkType: string): string {
  const names: Map<string, string> = new Map();
  names.set(PipelineStackType.INGESTION, `Clickstream-${PipelineStackType.INGESTION}-${sinkType}-${pipelineId}`);
  names.set(PipelineStackType.KAFKA_CONNECTOR, `Clickstream-${PipelineStackType.KAFKA_CONNECTOR}-${pipelineId}`);
  names.set(PipelineStackType.ETL, `Clickstream-${PipelineStackType.ETL}-${pipelineId}`);
  names.set(PipelineStackType.DATA_ANALYTICS, `Clickstream-${PipelineStackType.DATA_ANALYTICS}-${pipelineId}`);
  names.set(PipelineStackType.REPORT, `Clickstream-${PipelineStackType.REPORT}-${pipelineId}`);
  names.set(PipelineStackType.METRICS, `Clickstream-${PipelineStackType.METRICS}-${pipelineId}`);
  return names.get(key) ?? '';
}

function getKafkaTopic(pipeline: IPipeline):string {
  let kafkaTopic = pipeline.projectId;
  if (!isEmpty(pipeline.ingestionServer.sinkKafka?.topic)) {
    kafkaTopic = pipeline.ingestionServer.sinkKafka?.topic ?? pipeline.projectId;
  }
  return kafkaTopic;
}

function getPluginInfo(pipeline: IPipeline, resources: CPipelineResources ) {
  const transformerAndEnrichClassNames: string[] = [];
  const s3PathPluginJars: string[] = [];
  let s3PathPluginFiles: string[] = [];
  // Transformer
  if (!isEmpty(pipeline.etl?.transformPlugin) && !pipeline.etl?.transformPlugin?.startsWith('BUILT-IN')) {
    const transformer = resources!.plugins?.filter(p => p.id === pipeline.etl?.transformPlugin)[0];
    if (transformer?.mainFunction) {
      transformerAndEnrichClassNames.push(transformer?.mainFunction);
    }
    if (transformer?.jarFile) {
      s3PathPluginJars.push(transformer?.jarFile);
    }
    if (transformer?.dependencyFiles) {
      s3PathPluginFiles = s3PathPluginFiles.concat(transformer?.dependencyFiles);
    }
  } else {
    let defaultTransformer = resources.plugins?.filter(p => p.id === 'BUILT-IN-1')[0];
    if (defaultTransformer?.mainFunction) {
      transformerAndEnrichClassNames.push(defaultTransformer?.mainFunction);
    }
  }
  // Enrich
  if (pipeline.etl?.enrichPlugin) {
    for (let enrichPluginId of pipeline.etl?.enrichPlugin) {
      const enrich = resources.plugins?.filter(p => p.id === enrichPluginId)[0];
      if (!enrich?.id.startsWith('BUILT-IN')) {
        if (enrich?.jarFile) {
          s3PathPluginJars.push(enrich?.jarFile);
        }
        if (enrich?.dependencyFiles) {
          s3PathPluginFiles = s3PathPluginFiles.concat(enrich?.dependencyFiles);
        }
      }
      if (enrich?.mainFunction) {
        transformerAndEnrichClassNames.push(enrich?.mainFunction);
      }
    }
  }

  return {
    transformerAndEnrichClassNames,
    s3PathPluginJars,
    s3PathPluginFiles,
  };
}

export {
  isEmpty,
  tryToJson,
  getValueFromTags,
  getRegionAccount,
  generateRandomStr,
  getEmailFromRequestContext,
  getBucketPrefix,
  getStackName,
  getKafkaTopic,
  getPluginInfo,
};