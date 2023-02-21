import { apiRequest } from 'ts/request';

const getPipelineByProject = async (params: { pid: string }) => {
  const result: any = await apiRequest('get', `/pipeline/`, params);
  return result;
};

export { getPipelineByProject };
