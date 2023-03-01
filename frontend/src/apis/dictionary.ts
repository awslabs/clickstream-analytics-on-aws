import { apiRequest } from 'ts/request';

const getSDKTypeList = async () => {
  const result: any = await apiRequest('get', `/dictionary/SDK_Type`);
  return result;
};

export { getSDKTypeList };
