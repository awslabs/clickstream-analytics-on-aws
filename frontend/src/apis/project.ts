import { apiRequest } from 'ts/request';

const getProjectList = async (params: {
  pageNumber: number;
  pageSize: number;
}) => {
  const result: any = await apiRequest('get', '/project', params);
  return result;
};

const createProject = async (params: IProject) => {
  const result: any = await apiRequest('post', '/project', params);
  return result;
};

const updateProject = async (params: IProject) => {
  const result: any = await apiRequest(
    'put',
    `/project/${params.projectId}`,
    params
  );
  return result;
};

const getProjectDetail = async (id: string) => {
  const result: any = await apiRequest('get', `/project/${id}`);
  return result;
};

const deleteProject = async (id: string) => {
  const result: any = await apiRequest('delete', `/project/${id}`);
  return result;
};

export {
  getProjectList,
  createProject,
  updateProject,
  getProjectDetail,
  deleteProject,
};
