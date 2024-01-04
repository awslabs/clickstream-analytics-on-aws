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

import { StackStatus } from '@aws-sdk/client-cloudformation';
import { ExecutionStatus } from '@aws-sdk/client-sfn';
import { MOCK_SOLUTION_VERSION } from './ddb-mock';
import { BASE_PIPELINE_ATTRIBUTES } from './pipeline-mock';
import { PipelineStackType, PipelineStatusType } from '../../common/model-ln';
import { PipelineSinkType } from '../../common/types';
import { getPipelineStatusType } from '../../common/utils';
import { IPipeline } from '../../model/pipeline';


const BASE_STATUS_PIPELINE: IPipeline = {
  ...BASE_PIPELINE_ATTRIBUTES,
  ingestionServer: {
    ...BASE_PIPELINE_ATTRIBUTES.ingestionServer,
    sinkType: PipelineSinkType.S3,
    sinkS3: {
      sinkBucket: {
        name: 'EXAMPLE_BUCKET',
        prefix: '',
      },
      s3BatchMaxBytes: 1000000,
      s3BatchTimeout: 60,
    },
  },
};

const BASE_STACK_DETAIL = {
  stackId: 'arn:aws:cloudformation:ap-southeast-1:111122223333:stack/EXAMPLE/00000000-0000-0000-0000-000000000000',
  stackName: 'EXAMPLE',
  stackType: PipelineStackType.INGESTION,
  stackTemplateVersion: MOCK_SOLUTION_VERSION,
  stackStatus: StackStatus.CREATE_COMPLETE,
  stackStatusReason: '',
  outputs: [],
};

describe('Pipeline status test', () => {
  beforeEach(() => {
  });
  it('create status', async () => {
    // execution RUNNING
    // stacks []
    const pipeline1: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Create',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.RUNNING,
      },
      stackDetails: [],
    };
    expect(getPipelineStatusType(pipeline1)).toEqual(PipelineStatusType.CREATING);

    // execution FAILED
    // stacks []
    const pipeline2: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Create',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.FAILED,
      },
      stackDetails: [],
    };
    expect(getPipelineStatusType(pipeline2)).toEqual(PipelineStatusType.FAILED);

    // execution TIMED_OUT
    // stacks []
    const pipeline3: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Create',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.TIMED_OUT,
      },
      stackDetails: [],
    };
    expect(getPipelineStatusType(pipeline3)).toEqual(PipelineStatusType.FAILED);

    // execution RUNNING
    // stacks [CREATE_COMPLETE, CREATE_COMPLETE, CREATE_COMPLETE]
    const pipeline4: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Create',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.RUNNING,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline4)).toEqual(PipelineStatusType.CREATING);
    // execution RUNNING
    // stacks [CREATE_COMPLETE, CREATE_COMPLETE, CREATE_FAILED]
    const pipeline5: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Create',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.RUNNING,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_FAILED,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline5)).toEqual(PipelineStatusType.CREATING);
    // execution SUCCEEDED
    // stacks [CREATE_COMPLETE, CREATE_COMPLETE, CREATE_FAILED]
    const pipeline6: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Create',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.SUCCEEDED,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_FAILED,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline6)).toEqual(PipelineStatusType.FAILED);
    // execution FAILED
    // stacks [CREATE_COMPLETE, CREATE_COMPLETE, CREATE_FAILED]
    const pipeline7: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Create',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.FAILED,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_FAILED,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline7)).toEqual(PipelineStatusType.FAILED);
  });
  it('update status', async () => {
    // execution RUNNING
    // stacks []
    const pipeline1: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Update',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.RUNNING,
      },
      stackDetails: [],
    };
    expect(getPipelineStatusType(pipeline1)).toEqual(PipelineStatusType.UPDATING);

    // execution FAILED
    // stacks []
    const pipeline2: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Update',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.FAILED,
      },
      stackDetails: [],
    };
    expect(getPipelineStatusType(pipeline2)).toEqual(PipelineStatusType.WARNING);

    // execution TIMED_OUT
    // stacks []
    const pipeline3: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Update',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.TIMED_OUT,
      },
      stackDetails: [],
    };
    expect(getPipelineStatusType(pipeline3)).toEqual(PipelineStatusType.WARNING);

    // execution SUCCEEDED
    // stacks [UPDATE_COMPLETE, CREATE_COMPLETE, CREATE_COMPLETE]
    const pipeline4: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Update',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.SUCCEEDED,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline4)).toEqual(PipelineStatusType.ACTIVE);
    // execution RUNNING
    // stacks [CREATE_COMPLETE, CREATE_COMPLETE, UPDATE_FAILED]
    const pipeline5: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Update',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.RUNNING,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_FAILED,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline5)).toEqual(PipelineStatusType.UPDATING);
    // execution RUNNING
    // stacks [CREATE_COMPLETE, CREATE_COMPLETE, UPDATE_IN_PROGRESS]
    const pipeline6: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Update',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.RUNNING,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_IN_PROGRESS,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline6)).toEqual(PipelineStatusType.UPDATING);
    // execution FAILED
    // stacks [CREATE_COMPLETE, CREATE_COMPLETE, UPDATE_ROLLBACK_COMPLETE]
    const pipeline7: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Update',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.FAILED,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_ROLLBACK_COMPLETE,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline7)).toEqual(PipelineStatusType.WARNING);
    // execution FAILED
    // stacks [CREATE_COMPLETE, CREATE_COMPLETE, UPDATE_ROLLBACK_FAILED]
    const pipeline8: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Update',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.FAILED,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_ROLLBACK_FAILED,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline8)).toEqual(PipelineStatusType.WARNING);
  });
  it('upgrade status', async () => {
    // execution RUNNING
    // stacks [CREATE_COMPLETE, UPDATE_IN_PROGRESS, UPDATE_COMPLETE]
    const pipeline1: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Upgrade',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.RUNNING,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_IN_PROGRESS,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_COMPLETE,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline1)).toEqual(PipelineStatusType.UPDATING);
    // execution RUNNING
    // stacks [CREATE_COMPLETE, UPDATE_ROLLBACK_FAILED, UPDATE_COMPLETE]
    const pipeline2: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Upgrade',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.RUNNING,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_ROLLBACK_FAILED,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_COMPLETE,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline2)).toEqual(PipelineStatusType.UPDATING);
    // execution FAILED
    // stacks [CREATE_COMPLETE, UPDATE_ROLLBACK_FAILED, UPDATE_COMPLETE]
    const pipeline3: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Upgrade',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.FAILED,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_ROLLBACK_FAILED,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_COMPLETE,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline3)).toEqual(PipelineStatusType.WARNING);
    // execution SUCCEEDED
    // stacks [UPDATE_COMPLETE, UPDATE_COMPLETE, UPDATE_COMPLETE]
    const pipeline4: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Upgrade',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.SUCCEEDED,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.UPDATE_COMPLETE,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline4)).toEqual(PipelineStatusType.ACTIVE);
  });
  it('delete status', async () => {
    // execution RUNNING
    // stacks [CREATE_COMPLETE, DELETE_IN_PROGRESS, DELETE_COMPLETE]
    const pipeline1: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Delete',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.RUNNING,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.DELETE_IN_PROGRESS,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.DELETE_COMPLETE,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline1)).toEqual(PipelineStatusType.DELETING);
    // execution RUNNING
    // stacks [CREATE_COMPLETE, DELETE_FAILED, DELETE_COMPLETE]
    const pipeline2: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Delete',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.RUNNING,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.DELETE_FAILED,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline2)).toEqual(PipelineStatusType.DELETING);
    // execution SUCCEEDED
    // stacks [CREATE_COMPLETE, DELETE_FAILED, DELETE_COMPLETE]
    const pipeline3: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Delete',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.SUCCEEDED,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.CREATE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.DELETE_FAILED,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.DELETE_FAILED,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline3)).toEqual(PipelineStatusType.FAILED);
    // execution SUCCEEDED
    // stacks [DELETE_COMPLETE, DELETE_COMPLETE, DELETE_COMPLETE]
    const pipeline4: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Delete',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.SUCCEEDED,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.DELETE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.DELETE_COMPLETE,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.DELETE_COMPLETE,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline4)).toEqual(PipelineStatusType.DELETED);
    // execution SUCCEEDED
    // stacks [DELETE_IN_PROGRESS, DELETE_IN_PROGRESS, DELETE_COMPLETE]
    const pipeline5: IPipeline = {
      ...BASE_STATUS_PIPELINE,
      lastAction: 'Delete',
      executionDetail: {
        executionArn: 'arn:aws:states:us-east-1:123456789012:execution:EXAMPLE',
        name: 'EXAMPLE',
        status: ExecutionStatus.SUCCEEDED,
      },
      stackDetails: [
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.DELETE_IN_PROGRESS,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.DELETE_IN_PROGRESS,
        },
        {
          ...BASE_STACK_DETAIL,
          stackStatus: StackStatus.DELETE_COMPLETE,
        },
      ],
    };
    expect(getPipelineStatusType(pipeline5)).toEqual(PipelineStatusType.DELETING);
  });
  afterAll((done) => {
    done();
  });
});

