在VPC内部启动

**部署时间**: 大约30分钟

## 先决条件

请查看所有的[考虑因素](../plan-deployment/cost.md)并确保您在要部署解决方案的目标地区具备以下条件：

- 至少一个Amazon VPC。
- 至少两个跨越两个可用区的私有子网（带有NAT网关或实例）。

## 部署概述

按照以下步骤在AWS上部署此解决方案。

[步骤 1. 创建OIDC客户端](#1-oidc)

[步骤 2. 启动堆栈](#2)

[步骤 3. 更新OIDC客户端的回调URL](#3-oidc-url)

[步骤 4. 启动Web控制台](#4-web)

## 步骤 1. 创建OIDC客户端

您可以使用现有的OpenID Connect（OIDC）提供者，或按照[此指南][oidc-clients]创建一个OIDC客户端。

!!! tip "提示"
    默认情况下，此解决方案在VPC中部署控制台时不需要SSL证书。您必须使用OIDC客户端来支持具有`http`协议的回调URL。

## 步骤 2. 启动堆栈

1. 登录AWS管理控制台，并使用下方按钮启动AWS CloudFormation模板。

    |                           | 在AWS控制台中启动                                                                                                                                                                                                                                                            |
    |---------------------------| ------------------------- |
    | 在AWS区域中启动           | [![启动堆栈][launch-stack]][standard-intranet-template-url]{target=_blank}                               |
    | 在AWS中国区域中启动       | [![启动堆栈][launch-stack]][cn-intranet-template-url]{target=_blank}                                 |

2. 登录控制台后，模板将在默认区域中启动。如果要在其他AWS区域中启动{{ solution_name }}解决方案，请使用控制台导航栏中的区域选择器。
3. 在**创建堆栈**页面上，验证**Amazon S3 URL**文本框中显示的正确模板URL，并选择**下一步**。
4. 在**指定堆栈详细信息**页面上，为您的解决方案堆栈指定一个名称。有关命名字符限制的信息，请参阅*AWS Identity and Access Management用户指南*中的[IAM和AWS STS配额][iam-limits]{target='_blank'}部分。
5. 在**参数**下，查看模板的参数，并根据需要进行修改。

    * 此解决方案使用以下参数：

    | 参数             | 默认值           | 描述                                                         |
    | ---------------- | ---------------- | ------------------------------------------------------------ |
    | VpcId            | `<需要输入>`      | 选择要部署解决方案的VPC。 |
    | PrivateSubnets   | `<需要输入>`      | 选择要部署解决方案的子网。**注意**：您必须至少选择两个跨两个可用区的子网。 |
    | OIDCClientId     | `<需要输入>`      | OpenID Connect客户端ID。 |
    | OIDCProvider     | `<需要输入>`      | OpenID Connect提供者发布者。发布者必须以`https://`开头。 |

6. 选择**下一步**。
7. 在**配置堆栈选项**页面上，选择**下一步**。
8. 在**审查**页面上，审查并确认设置。勾选确认模板将创建AWS Identity and Access Management (IAM)资源的框。
9. 选择**创建堆栈**以部署堆栈。

您可以在AWS CloudFormation控制台中的**状态**列中查看堆栈的状态。大约10分钟后，您应该会收到**CREATE_COMPLETE**状态。

## 步骤 3. 更新 OIDC 客户端的回调 URL

1. 登录 [AWS CloudFormation 控制台][cloudformation]{target="_blank"}。
2. 选择解决方案的堆栈。
3. 选择 **输出** 选项卡。
4. 获取 **ControlPlaneURL** 作为端点。
5. 将回调 URL `${ControlPlaneURL}/signin` 更新或添加到您的 OIDC 客户端。
    1. 对于 Keycloak，请在 **有效重定向 URL** 中添加或更新 URL。
    2. 对于 Authing.cn，请在 **身份验证配置** 的 **登录回调 URL** 中添加或更新 URL。

## 步骤 4. 启动 Web 控制台

!!! info "重要提示"

    您的登录凭据由 OIDC 提供者管理。在登录到 {{ solution_name }} 控制台之前，请确保您已在 OIDC 提供者的用户池中创建了至少一个用户。

1. 由于您将解决方案控制台部署在无公共访问权限的 VPC 中，您需要建立与由内部应用负载均衡器提供服务的解决方案控制台的网络连接。以下是一些选项供您参考。
      1. （选项 1）使用跳板主机，例如 [Linux 跳板主机在 AWS 上][linux-bastion] 解决方案。
      2. （选项 2）使用 [AWS Client VPN][client-vpn] 或 [AWS Site-to-Site VPN][site-to-site-vpn]。
      3. （选项 3）使用 [AWS Direct Connect][dx]。
2. 应用负载均衡器只允许来自指定安全组的流量通过，您可以从步骤 2 中部署的堆栈的名为 **SourceSecurityGroup** 的输出中找到安全组 ID。然后将安全组附加到您的跳板主机或其他访问解决方案控制台的源。
3. 在 Web 浏览器中使用先前分配的域名或生成的 **ControlPlaneURL**。
4. 选择 **登录**，并导航到 OIDC 提供者。
5. 输入登录凭据。根据您的 OIDC 提供者的策略，您可能会被要求更改首次登录的默认密码。
6. 完成验证后，系统将打开 {{ solution_name }} Web 控制台。

登录到 {{ solution_name }} 控制台后，您可以开始为您的应用程序[创建项目][create-project]。

[subnet]: https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html#subnet-types
[oidc-clients]: ./with-oidc.md#step-1-create-oidc-client
[launch-stack]: ../images/launch-stack.webp
[standard-intranet-template-url]: https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/private-exist-vpc-control-plane-stack.template.json
[cn-intranet-template-url]: https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ aws_cn_bucket }}.s3.cn-north-1.amazonaws.com.cn/{{ aws_cn_prefix }}/{{ aws_cn_version }}/private-exist-vpc-control-plane-stack.template.json
[iam-limits]: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html
[cloudformation]: https://console.aws.amazon.com/cloudformation/
[create-project]: ../getting-started/1.create-project.md
[linux-bastion]: https://aws.amazon.com/solutions/implementations/linux-bastion/
[client-vpn]: https://aws.amazon.com/vpn/client-vpn/
[site-to-site-vpn]: https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html
[dx]: https://aws.amazon.com/directconnect/
