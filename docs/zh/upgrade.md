# 升级解决方案

!!! warning " 升级须知"

    1. 请注意,从版本 1.0.x 直接升级到此版本是不被支持的。必须先升级到[版本1.1.5][v115]。
    2. 从版本 1.1.5 或任何更早的 1.1 版本升级都会重建默认的仪表板分析，无法分析先前的数据。如果您需要迁移现有数据，请通过您的销售代表与 AWS Clickstream 团队联系以获取支持。

## 升级过程

### 升级 Web 控制台堆栈

1. 登录到 [AWS CloudFormation 控制台][cloudformation]，选择您现有的 [Web 控制台堆栈][console-stack]，然后选择**更新**。
2. 选择**替换当前模板**。
3. 在**指定模板**下：
     - 选择 Amazon S3 URL。
     - 请参阅下表查找适合您的部署类型的链接。
     - 将链接粘贴到 Amazon S3 URL 框中。
     - 再次选择**下一步**。

    | 模板      | 描述                          |
    | :---------- | :----------------------------------- |
    | [使用 Cognito 进行身份验证][cloudfront-s3-template]     | 在 AWS 区域中部署为公开服务  |
    | [使用 Cognito 通过自定义域进行身份验证][cloudfront-s3-custom-domain-template]     | 在 AWS 区域中部署为具有自定义域名的公开服务  |
    | [使用 OIDC 进行身份验证][cloudfront-s3-oidc-template]   | 在 AWS 区域中部署为公开服务 |
    | [使用 OIDC 通过自定义域进行身份验证][cloudfront-s3-oidc-custom-domain-template]    | 在 AWS 区域中部署为具有自定义域名的公开服务  |
    | [在 VPC 内使用 OIDC 进行身份验证][intranet-template]   | 在 AWS 区域的 VPC 内部署为私有服务  |
    | [在 AWS 中国使用 OIDC 对自定义域进行身份验证][cloudfront-s3-oidc-cn-template]    | 在 AWS 中国区域中部署为具有自定义域名的公开服务 |
    | [在 AWS 中国的 VPC 内使用 OIDC 进行身份验证][intranet-cn-template]   | 在 AWS 中国区域的 VPC 内部署为私有服务  |

4. 在**参数**下，查看模板的参数并根据需要进行修改。 参数详情请参考[部署][console-stack]。
5. 选择**下一步**。
6. 在 **配置堆栈选项** 页面上，选择 **下一步**。
7. 在**审核**页面上，查看并确认设置。 请务必选中该框，确认模板可能会创建 (IAM) 资源。
8. 选择 **查看更改集** 并验证更改。
9. 选择 **执行更改集** 以部署堆栈。

您可以在 AWS CloudFormation 控制台的 **状态** 列中查看堆栈的状态。 几分钟后您应该会收到“UPDATE_COMPLETE”状态。

### 升级项目管道

!!! info "重要提示"

    如果您在升级过程中遇到任何问题，请参考[故障排除页面][troubleshooting]。

1. 登录解决方案的Web控制台。
2. 转到**项目**，然后选择要升级的项目。
3. 点击`项目id`或**查看详情**按钮，将跳转至数据管道详细信息页面。
4. 在项目详情页面，点击**升级**按钮
5. 系统将提示您确认升级操作。
6. 点击**确认**，管道将处于“正在更新”状态。

您可以在解决方案控制台的 **状态** 列中查看管道的状态。 几分钟后您应该会收到`活跃`状态。

[quicksight-assets-export]: https://docs.aws.amazon.com/quicksight/latest/developerguide/assetbundle-export.html
[cloudformation]: https://console.aws.amazon.com/cloudfromation/
[console-stack]: ./deployment/index.md
[query-editor]: https://aws.amazon.com/redshift/query-editor-v2/
[working-with-query-editor]: https://docs.aws.amazon.com/redshift/latest/mgmt/query-editor-v2-using.html
[cloudfront-s3-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global.template.json
[cloudfront-s3-custom-domain-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-customdomain.template.json
[cloudfront-s3-oidc-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-oidc.template.json
[cloudfront-s3-oidc-custom-domain-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-customdomain-oidc.template.json
[cloudfront-s3-oidc-cn-template]: https://{{ aws_cn_bucket }}.s3.cn-north-1.amazonaws.com.cn/{{ aws_cn_prefix }}/{{ aws_cn_version }}/cloudfront-s3-control-plane-stack-cn.template.json
[intranet-template]: https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/private-exist-vpc-control-plane-stack.template.json
[intranet-cn-template]: https://{{ aws_cn_bucket }}.s3.cn-north-1.amazonaws.com.cn/{{ aws_cn_prefix }}/{{ aws_cn_version }}/private-exist-vpc-control-plane-stack.template.json
[troubleshooting]: ./troubleshooting.md
[v115]: https://awslabs.github.io/clickstream-analytics-on-aws/zh/1.1.5/upgrade/