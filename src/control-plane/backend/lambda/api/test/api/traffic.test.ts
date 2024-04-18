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

import { ESourceCategory, IChannelGroup, ISourceCategory } from '../../model/traffic';
import { ITrafficSourceType, TrafficSourceServ } from '../../service/traffic';

const trafficSourceServ = new TrafficSourceServ();

let groups: IChannelGroup[] = [];
let categories: ISourceCategory[] = [];

const group1: IChannelGroup = {
  id: '1',
  channel: 'channel1',
  displayName: {
    en: 'channel1',
  },
  description: {
    en: 'channel1',
  },
  condition: {
    type: 'string',
    value: 'channel1',
  },
};
const group2: IChannelGroup = {
  id: '2',
  channel: 'channel2',
  displayName: {
    en: 'channel2',
  },
  description: {
    en: 'channel2',
  },
  condition: {
    type: 'string',
    value: 'channel2',
  },
};

const category1: ISourceCategory = {
  url: 'url1',
  source: 'source1',
  category: ESourceCategory.SEARCH,
  params: ['param1', 'param2'],
};
const category2: ISourceCategory = {
  url: 'url2',
  source: 'source2',
  category: ESourceCategory.SOCIAL,
  params: ['param1', 'param2'],
};
function resetData() {
  groups = [
    group1,
    group2,
  ];

  categories = [
    category1,
    category2,
  ];
}

describe('Traffic action test', () => {
  beforeEach(() => {
    resetData();
  });
  it('New item', async () => {
    const newChannelGroup: IChannelGroup = {
      id: '3',
      channel: 'channel3',
      displayName: {
        en: 'channel3',
      },
      description: {
        en: 'channel3',
      },
      condition: {
        type: 'string',
        value: 'channel3',
      },
    };
    const newSourceCategory: ISourceCategory = {
      url: 'url3',
      source: 'source3',
      category: ESourceCategory.SHOPPING,
      params: ['param1', 'param2'],
    };
    const result1 = trafficSourceServ._newItem(groups, newChannelGroup);
    const result2 = trafficSourceServ._newItem(categories, newSourceCategory);
    expect(result1.length).toEqual(3);
    expect(result1[0].id).toEqual('3');
    expect(result2.length).toEqual(3);
    expect(result2[0].url).toEqual('url3');

  });
  it('Update item', async () => {
    const updateChannelGroup: IChannelGroup = {
      ...group2,
      channel: 'channel22',
    };
    const updateSourceCategory: ISourceCategory = {
      ...category2,
      source: 'source22',
    };
    const result1 = trafficSourceServ._updateItem(groups, updateChannelGroup, ITrafficSourceType.CHANNEL);
    const result2 = trafficSourceServ._updateItem(categories, updateSourceCategory, ITrafficSourceType.CATEGORY);
    expect(result1.length).toEqual(2);
    expect(result1[1].channel).toEqual('channel22');
    expect(result2.length).toEqual(2);
    expect(result2[1].source).toEqual('source22');
  });
  it('Delete item', async () => {
    const result1 = trafficSourceServ._deleteItem(groups, group2, ITrafficSourceType.CHANNEL);
    const result2 = trafficSourceServ._deleteItem(categories, category2, ITrafficSourceType.CATEGORY);
    expect(result1.length).toEqual(1);
    expect(result1[0].id).toEqual('1');
    expect(result2.length).toEqual(1);
    expect(result2[0].url).toEqual('url1');
  });
  afterAll((done) => {
    done();
  });
});