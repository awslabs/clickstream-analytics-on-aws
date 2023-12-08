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
