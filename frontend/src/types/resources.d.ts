export {};

declare global {
  interface RegionResponse {
    id: string;
    cn_name: string;
    en_name: string;
  }

  interface VPCResponse {
    cidr: string;
    id: string;
    isDefault: boolean;
    name: string;
  }

  interface SubnetResponse {
    id: string;
    name: string;
    cidr: string;
    availabilityZone: string;
    type: string;
  }

  interface SDKResponse {
    data: [{ name: string; value: string }];
    name: 'SDK_Type';
  }

  interface HostedZoneResponse {
    id: string;
    name: string;
  }

  interface S3Response {
    name: string;
  }
}
