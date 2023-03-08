import { apiRequest } from 'ts/request';

const getPipelineList = async (params: {
  pageNumber: number;
  pageSize: number;
}) => {
  const result: any = await apiRequest('get', '/pipeline', params);
  return result;
};

const getPipelineByProject = async (params: { pid: string }) => {
  const result: any = await apiRequest('get', `/pipeline`, params);
  return result;
};

const getPipelineDetail = async (params: { id: string; pid: string }) => {
  const result: any = await apiRequest(
    'get',
    `/pipeline/${params.id}?pid=${params.pid}`
  );
  return result;
};

const createProjectPipeline = async (data: IPipeline) => {
  const result: any = await apiRequest('post', `/pipeline`, data);
  return result;
};

const deletePipeline = async (id: string, pid: string) => {
  const result: any = await apiRequest('delete', `/pipeline/${id}?pid=${pid}`);
  return result;
};

export {
  getPipelineList,
  getPipelineByProject,
  getPipelineDetail,
  createProjectPipeline,
  deletePipeline,
};
