export {};
declare global {
  interface IPipeline {
    environment: string;
    updateAt: number;
    name: string;
    deleted: boolean;
    platform: string;
    createAt: number;
    emails: string;
    sk: string;
    region: string;
    description: string;
    pk: string;
    id: string;
  }
}
