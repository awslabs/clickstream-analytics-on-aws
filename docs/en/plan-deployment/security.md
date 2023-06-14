# Security

When you build systems on AWS infrastructure, security responsibilities are shared between you and AWS. This [shared responsibility model](https://aws.amazon.com/compliance/shared-responsibility-model/) reduces your operational burden because AWS operates,
manages, and controls the components including the host operating system, the virtualization layer, and the physical security of the facilities in which the services operate.
For more information about AWS security, see [AWS Cloud Security](http://aws.amazon.com/security/).

## IAM Roles

AWS Identity and Access Management (IAM) roles allow customers to assign granular access policies and permissions to services and users on the AWS Cloud.
This solution creates IAM roles that grant the solution’s AWS Lambda functions, Amazon API Gateway and Amazon Cognito or OpenID connect access to create regional resources.

## Amazon VPC

This solution optionally deploys a web console within your VPC.
You can isolate access to the web console via Bastion hosts, VPNs, or Direct Connect.
You can create [VPC endpoints][vpce] to let traffic between your Amazon VPC and AWS services not leave the Amazon network to satisfy the compliance requirements.

## Security Groups

The security groups created in this solution are designed to control and isolate network traffic between the solution components.
We recommend that you review the security groups and further restrict access as needed once the deployment is up and running.

## Amazon CloudFront

This solution optionally deploys a web console hosted in an Amazon S3 bucket and Amazon API Gateway.
To help reduce latency and improve security, this solution includes an Amazon CloudFront distribution with an Origin Access Control (OAC),
which is a CloudFront user that provides public access to the solution’s website bucket contents.
For more information, refer to [Restricting access to an Amazon S3 origin][oac] in the Amazon CloudFront Developer Guide.

[vpce]: https://docs.aws.amazon.com/whitepapers/latest/aws-privatelink/what-are-vpc-endpoints.html
[oac]: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
