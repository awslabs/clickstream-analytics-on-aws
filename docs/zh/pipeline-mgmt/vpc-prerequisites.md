- 在 VPC 中至少有两个公共子网跨越两个可用区。
- 在 VPC 中至少有两个私有子网（带 NAT 网关或实例）跨越两个可用区，或者在 VPC 中至少有两个隔离子网跨越两个可用区。如果您想将解决方案资源部署在隔离子网中，则必须为以下 AWS 服务创建 [VPC 终端][vpc-endpoints]，
    - `s3`、`logs`、`ecr.api`、`ecr.dkr`、`ecs`、`ecs-agent`、`ecs-telemetry`。
    - 如果您在摄取模块中使用 KDS 作为缓冲器，则为 `kinesis-streams`。
    - 如果您启用数据处理模块，则为 `emr-serverless`、`glue`。
    - 如果您在数据建模模块中启用 Redshift 作为分析引擎，则为 `redshift-data`、`sts`、`dynamodb`、`states` 和 `lambda`。

[vpc-endpoints]: https://docs.aws.amazon.com/zh_cn/whitepapers/latest/aws-privatelink/what-are-vpc-endpoints.html