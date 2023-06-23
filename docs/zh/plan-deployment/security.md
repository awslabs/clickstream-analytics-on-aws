# 安全性

当您在AWS基础架构上构建系统时，安全责任由您和AWS共同承担。这种[共享责任模型](https://aws.amazon.com/compliance/shared-responsibility-model/)可以减轻您的运营负担，因为AWS负责操作、管理和控制组件，包括主机操作系统、虚拟化层以及服务所在设施的物理安全。
有关AWS安全性的更多信息，请参阅[AWS云安全](http://aws.amazon.com/security/)。

## IAM角色

AWS身份和访问管理（IAM）角色允许客户为AWS云上的服务和用户分配细粒度的访问策略和权限。
此解决方案创建了IAM角色，授予解决方案的AWS Lambda函数、Amazon API Gateway和Amazon Cognito或OpenID Connect访问权限，用于创建区域资源。

## Amazon VPC

此解决方案可选择在您的VPC中部署Web控制台。
您可以通过Bastion主机、VPN或Direct Connect来隔离对Web控制台的访问。
您可以创建[VPC终端节点][vpce]，以使Amazon VPC与AWS服务之间的流量不离开Amazon网络，以满足合规性要求。

## 安全组

此解决方案创建的安全组旨在控制和隔离解决方案组件之间的网络流量。
我们建议您在部署完成后根据需要审查安全组并进一步限制访问。

## Amazon CloudFront

此解决方案可选择在Amazon S3存储桶和Amazon API Gateway中托管Web控制台。
为了减少延迟并提高安全性，此解决方案包括一个带有Origin Access Control（OAC）的Amazon CloudFront分发，
OAC是一个CloudFront用户，提供对解决方案网站存储桶内容的公共访问权限。
有关更多信息，请参阅Amazon CloudFront开发人员指南中的[限制对Amazon S3源的访问权限][oac]。

[vpce]: https://docs.aws.amazon.com/whitepapers/latest/aws-privatelink/what-are-vpc-endpoints.html
[oac]: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html