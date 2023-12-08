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
import { Service } from '../utils/request';

class ProductDataService {
  getAll() {
    return Service({
      url: '/product/all',
      method: 'get',
    });
  }
  findByTitle() {
    return Service({
      url: '/product/search',
      method: 'get',
    });
  }
  addProduct() {
    return Service({
      url: '/product/add',
      method: 'post',
    });
  }
}

export default new ProductDataService();
