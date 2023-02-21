export {};
declare global {
  enum EPlatfom {
    Web = 'Web',
    Android = 'Android',
    iOS = 'iOS',
  }

  interface IProject {
    name: string;
    platform: string;
    environment: string;
    emails: string;
    tableName: string;
    region: string;
    description: string;
    projectId?: string;
    updateAt?: number;
    operator?: string;
    deleted?: boolean;
    createAt?: number;
    type?: string;
    status?: string;
  }
}
