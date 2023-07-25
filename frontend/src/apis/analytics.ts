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

const getAnalyticsDashboardList = async (params: {
  pageNumber: number;
  pageSize: number;
}) => {
  const result: any = await new Promise((resolve, reject) => {
    resolve({
      success: true,
      message: 'OK',
      data: {
        totalCount: 2,
        items: [
          {
            id: 'asdsdsadsad',
            name: 'Dashboard Name 1',
            description: 'Dashboard description 1',
            createAt: 1690251290,
          },
          {
            id: 'asdsdsadsadasd',
            name: 'Dashboard Name 2',
            description: 'Dashboard description 2',
            createAt: 1690251290,
          },
        ],
      },
      error: '',
    });
  });
  return result;
};

export { getAnalyticsDashboardList };
