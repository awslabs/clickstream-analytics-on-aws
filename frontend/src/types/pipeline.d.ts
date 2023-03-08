import { SelectProps } from '@cloudscape-design/components';

export {};
declare global {
  interface IPipeline {
    pipelineId?: string;
    projectId: string;
    name: string;
    description: string;
    region: string;
    dataCollectionSDK: string;
    tags: ITag[];
    ingestionServer: {
      network: {
        vpcId: string;
        publicSubnetIds: string[];
        privateSubnetIds: string[];
      };
      size: {
        serverMin: string;
        serverMax: string;
        warmPoolSize: string;
        scaleOnCpuUtilizationPercent: string;
      };
      domain: {
        hostedZoneId: string;
        hostedZoneName: string;
        recordName: string;
      };
      loadBalancer: {
        serverEndpointPath: string;
        serverCorsOrigin: string;
        protocol: string;
        enableApplicationLoadBalancerAccessLog: boolean;
        logS3Bucket: string;
        logS3Prefix: string;
        notificationsTopicArn: string;
      };
      sinkType: string;
      sinkS3: {
        s3DataBucket: string;
        s3DataPrefix: string;
        s3BufferSize: string;
        s3BufferInterval: string;
      };
      sinkMSK: any;
      sinkKDS: any;
    };
    etl: any;
    dataModel: any;
    status?: string;
    createAt?: string;
    updateAt?: string;
  }

  interface IExtPipeline extends IPipeline {
    // temporary properties
    selectedRegion: SelectProps.Option | null;
    selectedVPC: SelectProps.Option | null;
    selectedSDK: SelectProps.Option | null;
    selectedPublicSubnet: OptionDefinition[];
    selectedPrivateSubnet: OptionDefinition[];
    enableEdp: boolean;
    selectedHostedZone: SelectProps.Option | null;
  }
}
