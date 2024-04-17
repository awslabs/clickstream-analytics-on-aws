# 基本配置

对于点击流项目，您可以指定数据管道的以下基本配置：

* **亚马逊云科技区域**: 选择管道所在区域。 如果您指定的区域有本方案支持但不可用的亚马逊云科技服务，则该功能将默认禁用。 检查[区域表][region-table]以了解功能可用性。
* **专有网络**: 指定管道的计算资源所在的专有网络。 此网络需要满足以下运行管道工作负载的标准。
    {%
      include-markdown "./vpc-prerequisites.md"
    %}
* **数据采集SDK**: 指定客户端使用的SDK类型。

    - 如果您选择 **Clickstream SDK**，您可以查看[SDK 手册][clickstream-sdks]以获取可用的 Clickstream SDK。
    - 如果您选择 **第三方 SDK**，该解决方案内置对 Google Tag Manager 的服务器端标记支持。 您可以按照[Guidance for Using Google Tag Manager for Server-Side Website Analytics on AWS][gtm-guidance] 在 AWS 上设置 GTM 服务器端服务器。 对于其他第三方SDK，还需要按照[此步骤][custom-plugin]使用自定义 Transformer 插件。

* **数据位置**: 指定保存点击流数据的 S3 存储桶。
    
    !!! info "注意"
        不支持使用 AWS KMS 密钥 (SSE-KMS) 加密的存储桶。

* **标签**: 为解决方案创建的 AWS 资源指定附加标签。

    !!! info "注意"
        该解决方案管理的三个内置标签无法更改或删除。

[region-table]: ../plan-deployment/regions.md
[clickstream-sdks]: ../sdk-manual/index.md
[gtm-guidance]: https://aws.amazon.com/solutions/guidance/using-google-tag-manager-for-server-side-website-analytics-on-aws/
[custom-plugin]: ./data-processing/configure-plugin.md#_3