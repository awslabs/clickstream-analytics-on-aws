- At least two public subnets across two availability zones (AZs) in the VPC.
- At least two private (with NAT gateways or instances) subnets across two AZs, or at least two isolated subnets across two AZs in the VPC. If you want to deploy the solution resources in the isolated subnets, you have to create [VPC endpoints][vpc-endpoints] for the AWS services below.
    - `s3`, `logs`, `ecr.api`, `ecr.dkr`, `ecs`, `ecs-agent`, `ecs-telemetry`.
    - `kinesis-streams` if you use KDS as a sink buffer in the ingestion module.
    - `emr-serverless`, `glue` if you enable the data processing module.
    - `redshift-data`, `sts`, `dynamodb`(must be [Gateway endpoints for DynamoDB][gateway-endppint]), `states` and `lambda` if you enable Redshift as an analytics engine in the data modeling module.

[vpc-endpoints]: https://docs.aws.amazon.com/whitepapers/latest/aws-privatelink/what-are-vpc-endpoints.html
[gateway-endppint]: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-ddb.html