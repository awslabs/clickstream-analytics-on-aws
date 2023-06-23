该解决方案采用 [AWS 架构完善的框架][well-architected-framework]  中的最佳实践而设计，该框架可帮助客户在云端设计和运行可靠、安全、高效且经济实惠的工作负载。

本节介绍在构建此解决方案时如何应用 AWS 架构完善的框架 的设计原则和最佳实践。

## 卓越运营

本节介绍在设计此解决方案时如何应用 [卓越运营支柱][operational-excellence-pillar]  的原则和最佳实践。

{{ solution_name }} 解决方案在不同阶段向 Amazon CloudWatch 推送指标、日志和跟踪，为基础设施、弹性负载均衡器、Amazon ECS 集群、Lambda 函数、EMR 无服务器应用程序、Step Function 工作流程和其他解决方案组件提供可观察性能力。该解决方案还为每个 [数据管道] [data-pipeline] 创建 CloudWatch 控制面板。

## 安全

本节介绍在设计此解决方案时如何应用 [安全支柱] [security-pillar] 的原则和最佳实践。

- {{ solution_name }} Web 控制台用户通过Amazon Cognito 或 OpenID Connect 进行身份验证和授权。
- 所有服务间通信都使用 AWS IAM 角色。
- 该解决方案使用的所有角色都遵循最小权限访问原则。也就是说，它仅包含服务正常运行所需的最小权限。

## 可靠性

本节介绍在设计此解决方案时如何应用 [可靠性支柱] [reliability-pillar] 的原则和最佳实践。

- 尽可能使用 AWS 无服务器服务（例如 EMR Serverless、Redshift Serverless、Lambda、Step Functions、Amazon S3 和 Amazon SQS）来确保高可用性和从服务故障中恢复。
- [数据管道] [data-pipeline] 摄取的数据存储在 Amazon S3 和 Amazon Redshift 中，因此默认情况下，它会保留在多个可用区中。

## 性能效率

本节介绍在设计此解决方案时如何应用 [性能效率支柱] [performance-efficiency-pillar] 的原则和最佳实践。

- 能够在此解决方案中支持的任何地区启动此解决方案，例如：Amazon S3、Amazon ECS、弹性负载均衡器。
- 使用无服务器架构无需为传统计算活动运行和维护物理服务器。
- 每天自动测试和部署此解决方案。由解决方案架构师和领域专家审查此解决方案，找出需要尝试改进的领域。

## 成本优化

本节介绍在设计此解决方案时如何应用 [成本优化支柱] [cost-optimization-pillar] 的原则和最佳实践。

- 使用 Autoscaling Group，使计算成本仅与摄入和处理的数据量有关。
- 使用 Amazon S3、Amazon Kinesis Data Streams、Amazon EMR Serverless 和 Amazon Redshift Serverless 等无服务器服务，这样客户只需按使用的内容付费。

## 可持续性

本节介绍在设计该解决方案时如何应用 [可持续发展支柱] [sustainability-pillar] 的原则和最佳实践。

- 与持续运行的本地服务器相比，该解决方案的无服务器设计（使用Amazon Kinesis Data Streams、Amazon EMR Serverless、Amazon Redshift Serverless和Amazon QuickSight）和托管服务（例如Amazon ECS、Amazon MSK）旨在减少碳足迹。

[well-architected-framework]:https://aws.amazon.com/architecture/well-architected/?wa-lens-whitepapers.sort-by=item.additionalFields.sortDate&wa-lens-whitepapers.sort-order=desc&wa-guidance-whitepapers.sort-by=item.additionalFields.sortDate&wa-guidance-whitepapers.sort-order=desc
[operational-excellence-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/welcome.html
[security-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html
[reliability-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html
[performance-efficiency-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/welcome.html
[cost-optimization-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html
[sustainability-pillar]:https://docs.aws.amazon.com/wellarchitected/latest/sustainability-pillar/sustainability-pillar.html
[data-pipeline]: ./pipeline-mgmt/index.md
