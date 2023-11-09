# 使用 Cognito 用户池启动

**部署所需时间**：大约 15 分钟

## 部署概述

按照以下步骤在 AWS 上部署此解决方案。

[步骤 1. 启动堆栈](#1)

[步骤 2. 启动 Web 控制台](#2-web)

## 步骤 1. 启动堆栈

此 AWS CloudFormation 模板会在 AWS 上自动部署 {{ solution_name }} 解决方案。

1. 登录到 [AWS 管理控制台](https://console.aws.amazon.com/)，并选择启动 AWS CloudFormation 模板的按钮。

    |                             | 在 AWS 控制台中启动                                                                                                                                                                                                                                   |
    |---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------ |
    | 启动堆栈      | [![启动堆栈][launch-stack]][cloudfront-cognito-template-url]{target=_blank}              |
    | 启动具有自定义域的堆栈     | [![启动堆栈][launch-stack]][cloudfront-cognito-custom-domain-template-url]{target=_blank}              |

2. 登录到控制台后，模板会在默认区域中启动。若要在其他 AWS 区域中启动 {{ solution_name }} 解决方案，请使用控制台导航栏中的区域选择器。

3. 在 **创建堆栈** 页面上，验证 **Amazon S3 URL** 文本框中显示的正确模板 URL，并选择 **下一步**。

4. 在 **指定堆栈详细信息** 页面上，为您的解决方案堆栈指定一个名称。有关名称字符限制的信息，请参阅 *AWS 身份和访问管理用户指南* 中的 [IAM 和 AWS STS 配额][iam-limits]{target='_blank'}。

5. 在 **参数** 下，查看模板的参数，并根据需要进行修改。

    - 此解决方案使用以下参数：

        | 参数  | 默认值          | 描述                                                  |
        | ---------- | ---------------- | ------------------------------------------------------------ |
        | 管理员用户电子邮件 | `<需要输入>` | 指定管理员的电子邮件地址。此电子邮件地址将收到一个临时密码，用于访问 {{ solution_name }} Web 控制台。您可以在启动解决方案后直接在配置的 Cognito 用户池中创建更多用户。 |

        !!! info "重要提示"
            {%
            include-markdown "./tls-note.md"
            %}

    - 如果在 AWS 区域中使用自定义域启动解决方案，则此解决方案使用以下额外参数：

        | 参数  | 默认值          | 描述                                                  |
        | ---------- | ---------------- | ------------------------------------------------------------ |
        | 托管区域 ID | `<需要输入>` | 选择 Amazon Route 53 的公共托管区域 ID。 |
        | 托管区域名称 | `<需要输入>` | 公共托管区域的域名，例如 `example.com`。 |
        | 记录名称 | `<需要输入>` | 控制台的域名的子名称（在 R53 中称为记录名称）。例如，如果您要为控制台使用自定义域 `clickstream.example.com`，请输入 `clickstream`。 |

6. 选择 **下一步**。

7. 在 **配置堆栈选项** 页面上，选择 **下一步**。

8. 在 **审核** 页面上，审核并确认设置。选中确认模板将创建 AWS 身份和访问管理 (IAM) 资源的框。

9. 选择 **创建堆栈** 以部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。大约 15 分钟后，您应该会收到 **CREATE_COMPLETE** 状态。

## 步骤 2. 启动 Web 控制台

堆栈成功创建后，此解决方案会生成一个 CloudFront 域名，用于访问 {{ solution_name }} Web 控制台。
与此同时，一个自动生成的临时密码将发送到您的电子邮件地址。

1. 登录到 [AWS CloudFormation 控制台][cloudformation]{target='_blank'}。

2. 在 **堆栈** 页面上，选择解决方案的堆栈。

3. 选择 **输出** 选项卡，并记录域名。

4. 使用 Web 浏览器打开 **ControlPlaneURL**，并导航到登录页面。

5. 输入 **电子邮件** 和临时密码。

    a. 设置新的账户密码。

    b.（可选）验证您的电子邮件地址以进行账户恢复。

6. 完成验证后，系统会打开 {{ solution_name }} Web 控制台。

登录到 {{ solution_name }} 控制台后，您可以开始为您的应用程序[创建一个项目][create-project]。

[launch-stack]: ../images/launch-stack.webp
[cloudfront-cognito-template-url]: https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global.template.json
[cloudfront-cognito-custom-domain-template-url]: https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-customdomain.template.json
[iam-limits]: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html
[cloudformation]: https://console.aws.amazon.com/cloudformation/
[create-project]: ../getting-started/1.create-project.md
