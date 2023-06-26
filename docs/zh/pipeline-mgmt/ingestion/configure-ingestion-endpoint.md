# 摄取端点设置

该解决方案创建了一个 Web 服务作为摄取端点，用于收集从您的 SDK 发送的数据。您可以为摄取端点设置以下配置：

* **公共子网**：选择至少两个现有的 VPC 公共子网，Amazon 应用程序负载均衡器 (ALB) 将部署在这些子网中。

* **私有子网**：选择至少两个现有的 VPC 私有子网，运行在 ECS 中的 EC2 实例将部署在这些子网中。

    !!! tip "提示"

        公共子网所在的可用区必须与私有子网的可用区保持一致。

* **摄取容量**：此配置设置摄取服务器的容量，摄取服务器将根据处理 CPU 的利用率自动扩展或缩减。

    * 最小容量：摄取服务器将缩减到的最小容量。

    * 最大容量：摄取服务器将扩展到的最大容量。

    * 热池：热池使您能够减少具有异常长引导时间的应用程序的延迟。有关更多信息，请参阅[Amazon EC2 Auto Scaling 的热池](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html)。

* **启用 HTTPS**：用户可以选择 Ingestion 端点的 HTTPS/HTTP 协议。

    * 启用 HTTPS：如果用户选择启用 HTTPS，则摄取服务器将提供 HTTPS 端点。

        * 域名：输入域名。一旦摄取服务器创建完成，使用自定义端点在您的域名系统 (DNS) 中创建别名或 CNAME 映射。

        * SSL 证书：用户需要选择与输入的域名相对应的 ACM 证书。如果没有 ACM 证书，请参考[创建公共证书](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html)来创建。

    * 禁用 HTTPS：如果用户选择禁用 HTTPS，则摄取服务器将提供 HTTP 端点。

        !!! warning "重要提示"

            使用 HTTP 协议是不安全的，因为数据将在没有任何加密的情况下发送，数据在传输过程中存在泄漏或篡改的高风险。请确认风险后再进行操作。

* 其他设置

    * 请求路径：用户可以输入摄取端点的路径来收集数据，缺省路径为“/collect”。

    * AWS 全球加速器：用户可以选择创建加速器来获取充当全局固定入口点的静态 IP 地址，以提高摄取服务器的可用性和性能。 

      **注意**：额外的费用适用。

    * 鉴权：用户可以使用 OIDC 提供程序对发送到您的摄取服务器的请求进行身份验证。如果您计划启用 OIDC，请在 OIDC 提供程序中创建一个 OIDC 客户端，然后在 AWS Secret Manager 中创建一个包含以下信息的密钥：

        * issuer

        * token endpoint

        * User endpoint

        * Authorization endpoint

        * App client ID

        * App Client Secret

        格式如下：
        ```
          {
            "issuer":"xxx",
            "userEndpoint":"xxx",
            "authorizationEndpoint":"xxx",
            "tokenEndpoint":"xxx",
            "appClientId":"xxx",
            "appClientSecret":"xxx"
          }
        ```
      **注意**：在 OIDC 提供程序中，您需要将 `https://<ingestion server endpoint>/oauth2/idpresponse` 添加到“允许回调 URL”。

    * 访问日志：ALB 支持提供其接收的所有请求的详细日志。如果您启用此选项，则解决方案将自动为您启用访问日志，并将日志存储在您之前选择的 S3 存储桶中。

        !!! tip "提示"

            存储桶必须具有 [授权 Elastic Load Balancing 写入存储桶的存储桶策略][alb-permission]。

            下面是 **2022 年 8 月之前可用的区域** 存储桶的示例策略：

            ```json
            {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Principal": {
                    "AWS": "arn:aws:iam::<elb-account-id>:root"
                  },
                  "Action": "s3:PutObject",
                  "Resource": "arn:aws:s3:::<BUCKET>/clickstream/*"
                }
              ]
            }
            ```

            下面是 **2022 年 8 月或之后可用的区域** 存储桶的示例策略：

            ```json
            {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Principal": {
                    "Service": "logdelivery.elasticloadbalancing.amazonaws.com"
                  },
                  "Action": "s3:PutObject",
                  "Resource": "arn:aws:s3:::<BUCKET>/clickstream/*"
                }
              ]
            }
            ```

[alb-permission]: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
