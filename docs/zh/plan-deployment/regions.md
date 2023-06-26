## 区域部署

此解决方案使用的服务可能尚未在所有 AWS 区域提供。请在提供所需服务的 AWS 区域中启动此解决方案。有关各个区域的最新可用性，请参阅[AWS 区域服务列表][services]。

AWS 上的 Clickstream Analytics 提供了两种身份验证方式，[Cognito 用户池][cognito]和[OpenID Connect (OIDC) 提供商][oidc]。您必须选择使用 OpenID Connect 来启动解决方案，如果满足以下情况之一：

- 在您的 AWS 区域中不可用 Cognito 用户池。
- 您已经拥有一个 OpenID Connect 提供商，并希望使用其进行身份验证。

**支持 Web 控制台部署的区域**

| 区域名称                                 | 使用 Cognito 用户池启动         | 使用 OpenID Connect 启动       |
| --------------------------------------- | ------------------------------- | ------------------------------ |
| 美国东部（弗吉尼亚北部）                 | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 美国东部（俄亥俄州）                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 美国西部（加利福尼亚北部）               | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 美国西部（俄勒冈州）                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 非洲（开普敦）                           | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| 亚太地区（香港）                         | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| 亚太地区（孟买）                         | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 亚太地区（大阪）                         | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| 亚太地区（首尔）                         | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 亚太地区（新加坡）                       | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 亚太地区（悉尼）                         | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 亚太地区（东京）                         | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 加拿大（中部）                           | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 欧洲（法兰克福）                        | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 欧洲（爱尔兰）                          | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 欧洲（伦敦）                           | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 欧洲（米兰）                            | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| 欧洲（巴黎）                            | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 欧洲（斯德哥尔摩）                        | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 中东（巴林）                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 南美洲（圣保罗）                 | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| 中国（北京）由 Sinnet 运营的区域 | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| 中国（宁夏）由 NWCD 运营的区域  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |

该解决方案提供了[模块化组件](../architecture.md)，用于支持不同的数据管道架构。数据处理、数据建模和报表模块是可选的，也就是说，如果需要，您可以创建一个没有数据处理、数据建模和报表模块的数据管道。

**管道模块的可用性**

| 地区名称                              | 使用 MSK 作为缓冲进行数据摄取     | 使用 KDS 作为缓冲进行数据摄取     | 使用 S3 作为缓冲进行数据摄取      | 数据处理                           | 使用 Redshift 无服务器进行数据建模        | 使用预置 Redshift 进行数据建模          | 使用 QuickSight 进行报告              |
|-------------------------------------|------------------------------------|------------------------------------|------------------------------------|-------------------------------------|-------------------------------------|-------------------------------------|-------------------------------------|
| 美国东部（弗吉尼亚北部）                  | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } |
| 美国东部（俄亥俄州）                    | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } |
| 美国西部（加利福尼亚北部）                | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-close-thick:{ .icon_cross } |
| 美国西部（俄勒冈）                      | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } |
| 非洲（开普敦）                          | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| 亚太地区（香港）                        | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } | :material-close-thick:{ .icon_cross } |
| 亚太地区（孟买）                        | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } |
| 亚太区域（大阪）                            | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| 亚太区域（首尔）                            | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 亚太区域（新加坡）                          | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 亚太区域（悉尼）                            | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 亚太区域（东京）                            | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 加拿大区域（中部）                          | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 欧洲区域（法兰克福）                        | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 欧洲（爱尔兰）                               | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 欧洲（伦敦）                                | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 欧洲（米兰）                                | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| 欧洲（巴黎）                                | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 欧洲（斯德哥尔摩）                            | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 中东（巴林）                                | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } |
| 南美洲（圣保罗）                            | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| 中国（北京）地区，由 Sinnet 运营*                   | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } |
| 中国（宁夏）地区，由 NWCD 运营*                    | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } |

!!! info "注意(*)"

    AWS 中国区域不支持使用 AWS 全球加速器加速数据摄入端点。

[services]: https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/?nc1=h_ls
[cognito]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html
[oidc]: https://openid.net/connect/
[architecture]: ./architecture.md