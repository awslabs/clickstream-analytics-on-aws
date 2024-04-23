# AWS 中国区域实施的先决条件 

在 AWS 中国区域部署解决方案之前，您需要满足比 [AWS 全球区域][deployment-prerequisites]更多的先决条件。

## Web 控制台先决条件

- 您必须已通过光环新网或西云数据[为 AWS 中国账户申请或接入了 ICP 备案][icp]。
- 您还应为 Web 控制台准备一个OIDC客户端,用于身份验证。请参考[本文档][oidc-client]了解集成部分知名 OIDC 提供商的步骤。
- (仅适用于[部署公网可访问解决方案][oidc])您需要拥有一个已完成 ICP 备案的域名,并有权为 Web 控制台的域名添加新的 DNS 记录。您必须为 Web 控制台的域名申请有效的 SSL 证书，并按照[本指南][ssl-upload]将证书上传到 AWS IAM。

## 数据管道先决条件

- (仅适用于[启用报表功能][reporting])您需要先[注册 QuickSight 企业版订阅][quicksight-signup]。此外,您需要在部署解决方案的 Web 控制台之前至少[创建一个 QuickSight 管理员用户][quicksight-manage-users]。

[icp]: https://www.amazonaws.cn/support/icp/?nc1=h_ls
[oidc-client]: ../deployment/with-oidc.md#1-oidc
[oidc]: ../deployment/with-oidc.md
[ssl-upload]: ./upload-ssl-certificate.md
[deployment-prerequisites]: ../deployment/index.md#_2
[quicksight-signup]: https://docs.amazonaws.cn/en_us/quicksight/latest/user/setting-up-sso.html
[reporting]: ../pipeline-mgmt/quicksight/configure-quicksight.md
[quicksight-manage-users]: https://docs.amazonaws.cn/en_us/quicksight/latest/user/managing-user-access-idc.html#view-user-accounts-enterprise