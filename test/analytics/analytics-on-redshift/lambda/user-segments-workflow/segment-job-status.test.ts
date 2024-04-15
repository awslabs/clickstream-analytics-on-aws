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

import { Readable } from 'stream';
import { SegmentJobStatus } from '@aws/clickstream-base-lib';
import { DescribeStatementCommand, RedshiftDataClient, StatusString } from '@aws-sdk/client-redshift-data';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { sdkStreamMixin } from '@smithy/util-stream-node';
import { mockClient } from 'aws-sdk-client-mock';
import {
  handler,
  SegmentJobStatusEvent,
} from '../../../../../src/analytics/lambdas/user-segments-workflow/segment-job-status';
import 'aws-sdk-client-mock-jest';
import { getMockContext } from '../../../../common/lambda-context';

describe('User segments workflow segment-job-status lambda tests', () => {
  const ddbDocClientMock = mockClient(DynamoDBDocumentClient);
  const redshiftDataClientMock = mockClient(RedshiftDataClient);
  const s3ClientMock = mockClient(S3Client);
  const contextMock = getMockContext();
  let event: SegmentJobStatusEvent;

  beforeEach(() => {
    event = {
      appId: 'app-id',
      segmentId: 'segment-id',
      jobRunId: 'job-run-id',
      queryId: 'query-id',
      jobStatus: SegmentJobStatus.IN_PROGRESS,
    };
  });

  test('Segment job is running', async () => {
    redshiftDataClientMock.on(DescribeStatementCommand).resolves({ Status: StatusString.STARTED });

    const resp = await handler(event, contextMock);

    expect(resp).toEqual({
      ...event,
      jobStatus: SegmentJobStatus.IN_PROGRESS,
      waitTimeInfo: {
        waitTime: 30,
        loopCount: 1,
      },
    });
    expect(ddbDocClientMock).not.toHaveReceivedCommandWith(UpdateCommand, expect.any(Object));
  });

  test('Segment job is completed', async () => {
    const fullDataStream = new Readable();
    fullDataStream.push('user_pseudo_id,event_timestamp,user_id,user_properties,user_properties_json_str,first_touch_time_msec,first_visit_date,first_referrer,first_traffic_source,first_traffic_medium,first_traffic_campaign,first_traffic_content,first_traffic_term,first_traffic_campaign_id,first_traffic_clid_platform,first_traffic_clid,first_traffic_channel_group,first_traffic_category,first_app_install_source\n' +
      'b7c3f8ae-6e38-4b82-a37d-885807faa420,2024-03-29 11:40:53.471,57d7eb70-dbdc-4f26-97f1-9c804c590276,null,"{""_user_first_touch_timestamp"":{""set_time_msec"":1710074377017,""value"":1710074377017},""gender"":{""set_time_msec"":1711260724944,""value"":""male""},""_user_id"":{""set_time_msec"":1711260724944,""value"":""57d7eb70-dbdc-4f26-97f1-9c804c590276""},""_user_name"":{""set_time_msec"":1711260724944,""value"":""Nova Brown""},""age"":{""set_time_msec"":1711260724944,""value"":34}}",1710074377017,2024-03-10,,,,,,,,,,,,Google play\n' +
      'b551d65e-1174-4cbd-97b8-cedb7e9c8b71,2024-04-04 13:06:46.031,f0526974-ed43-4a7b-9c62-f652b4d7f4a5,null,"{""_user_first_touch_timestamp"":{""set_time_msec"":1710923496507,""value"":1710923496507},""gender"":{""set_time_msec"":1710923526847,""value"":""male""},""_user_id"":{""set_time_msec"":1710923526847,""value"":""f0526974-ed43-4a7b-9c62-f652b4d7f4a5""},""_user_name"":{""set_time_msec"":1710923526847,""value"":""Charlotte Henderson""},""age"":{""set_time_msec"":1710923526847,""value"":40}}",1710923496507,2024-03-20,,,,,,,,,,,,Vivo Store\n' +
      '0e394521-ccf7-471c-8c36-e54340223baf,2024-04-07 09:13:44.603,22770384-d030-41b7-aee3-a31fb420e0f0,null,"{""_user_first_touch_timestamp"":{""set_time_msec"":1710325181166,""value"":1710325181166},""gender"":{""set_time_msec"":1712481224458,""value"":""female""},""_user_id"":{""set_time_msec"":1712481224458,""value"":""22770384-d030-41b7-aee3-a31fb420e0f0""},""_user_name"":{""set_time_msec"":1712481224458,""value"":""Aria Nelson""},""age"":{""set_time_msec"":1712481224458,""value"":33}}",1709973019308,2024-03-09,,bytedance,Search,,,,,,,,,QQ Store\n');
    fullDataStream.push(null);

    redshiftDataClientMock.on(DescribeStatementCommand).resolves({ Status: StatusString.FINISHED });
    s3ClientMock.on(GetObjectCommand)
      .resolvesOnce({
        Body: {
          transformToString: async () => (
            'segment_user_number,total_user_number,job_end_time\n' +
            '1056,3677,1712724208234\n'
          ),
        },
      } as any)
      .resolvesOnce({
        Body: sdkStreamMixin(fullDataStream),
      });

    const resp = await handler({
      ...event,
      waitTimeInfo: {
        waitTime: 25,
        loopCount: 5,
      },
    }, contextMock);

    expect(resp).toEqual({
      ...event,
      jobStatus: SegmentJobStatus.COMPLETED,
      waitTimeInfo: {
        waitTime: 35,
        loopCount: 6,
      },
    });
    expect(ddbDocClientMock).toHaveReceivedCommandWith(UpdateCommand, {
      TableName: 'ClickStreamApiClickstreamMetadata',
      Key: {
        id: event.segmentId,
        type: `SEGMENT_JOB#${event.jobRunId}`,
      },
      UpdateExpression: 'set jobStatus = :js, jobEndTime = :et, segmentUserNumber = :su, totalUserNumber = :tu, sampleData = :sd',
      ExpressionAttributeValues: {
        ':js': SegmentJobStatus.COMPLETED,
        ':et': '1712724208234',
        ':su': '1056',
        ':tu': '3677',
        ':sd': expect.any(Object),
      },
      ReturnValues: 'ALL_NEW',
    });
  });

  test('Segment job is failed', async () => {
    redshiftDataClientMock.on(DescribeStatementCommand).resolves({ Status: StatusString.FAILED });

    const resp = await handler(event, contextMock);

    expect(resp).toEqual({
      ...event,
      jobStatus: SegmentJobStatus.FAILED,
      waitTimeInfo: {
        waitTime: 30,
        loopCount: 1,
      },
    });
    expect(ddbDocClientMock).toHaveReceivedCommandWith(UpdateCommand, {
      TableName: 'ClickStreamApiClickstreamMetadata',
      Key: {
        id: event.segmentId,
        type: `SEGMENT_JOB#${event.jobRunId}`,
      },
      UpdateExpression: 'set jobStatus = :js, jobEndTime = :et',
      ExpressionAttributeValues: {
        ':js': SegmentJobStatus.FAILED,
        ':et': expect.any(Number),
      },
      ReturnValues: 'ALL_NEW',
    });
  });
});
