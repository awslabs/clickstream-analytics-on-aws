# 概述

在启动解决方案之前，请查看本指南中讨论的架构、支持的区域和其他注意事项。按照本部分的逐步说明配置和部署解决方案到您的账户中。

## 先决条件

请查看所有[注意事项](../plan-deployment/cost.md)，并确保您在要部署解决方案的目标区域具备以下条件：

- 至少有两个空闲的 S3 存储桶。

## 在 AWS 区域中部署

{{ solution_name }} 提供两种方式进行身份验证并登录到解决方案的 Web 控制台。对于某些 AWS 区域，Cognito 用户池不可用（例如，香港），您必须使用 OpenID Connect 来启动解决方案。

- [使用 Cognito 用户池启动][cognito]。（开始最快的方式，适用于大多数 AWS 区域。）
- [使用 OpenID Connect 启动][oidc]。

有关支持的区域的更多信息，请参阅[区域部署](../plan-deployment/regions.md)。

## 在 AWS 中国区域中部署

AWS 中国区域不支持 Cognito 用户池。您必须使用 OpenID Connect 来启动解决方案。

- [使用 OpenID Connect 启动][oidc]

## 在 Amazon VPC 中部署

{{ solution_name }} 可以部署到 Amazon VPC 中，允许在不离开您的 VPC 网络的情况下访问 Web 控制台。

- [在 VPC 中部署][intranet]

[cognito]: ./with-cognito.md
[oidc]: ./with-oidc.md
[intranet]: ./within-vpc.md
