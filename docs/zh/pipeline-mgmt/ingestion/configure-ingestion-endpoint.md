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

    !!! warning "重要提示"

        如果您在启用和禁用 HTTPS 之间进行切换，会导致服务中断。            

* **跨源资源共享 (CORS)**: 您可以启用 CORS 来限制来自特定域的数据摄取 API 的请求。请注意，你需要输入一个完整的互联网地址，例如 https://www.example.com、http://localhost:8080。如果您有多个域用于此设置，请使用逗号分隔域。

    !!! warning "重要提示"

        如果您要从网站收集数据，则必须设置 CORS。如果您未为此参数设置值，则摄取服务器将拒绝所有从网页平台来的请求。

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
        ```json
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

        **注意**：如果您需要在不手动输入凭据（用户名/密码）的情况下直接获取身份验证令牌，您可以参考[ALB无头身份验证客户端代码][alb-headless-authentication-client]来设置您的客户端以自动获取身份验证令牌。

        !!! warning "重要提示"

            如果您在启用和禁用鉴权之间进行切换，会导致服务中断。

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

            将 `elb-account-id` 替换为用于所在区域 Elastic Load Balancing 的 Amazon Web Services 账户 的 ID：

            - 美国东部（弗吉尼亚州北部）– 127311923021
            - 美国东部（俄亥俄州）– 033677994240
            - 美国西部（北加利福尼亚）– 027434742980
            - 美国西部（俄勒冈州）– 797873946194
            - 非洲（开普敦）– 098369216593
            - 亚太地区（香港）– 754344448648
            - 亚太地区（雅加达）– 589379963580
            - 亚太地区（孟买）– 718504428378
            - 亚太地区（大阪）– 383597477331
            - 亚太地区（首尔）– 600734575887
            - 亚太地区（新加坡）– 114774131450
            - 亚太地区（悉尼）– 783225319266
            - 亚太地区（东京）– 582318560864
            - 加拿大（中部）– 985666609251
            - 欧洲（法兰克福）– 054676820928
            - 欧洲（爱尔兰）– 156460612806
            - 欧洲（伦敦）– 652711504416
            - 欧洲（米兰）– 635631232127
            - 欧洲（巴黎）– 009996457667
            - 欧洲（斯德哥尔摩）– 897822967062
            - 中东（巴林）– 076674570225
            - 南美洲（圣保罗）– 507241528517
            - 中国（北京）– 638102146993
            - 中国（宁夏）– 037604701340

<!--
            下面是 **2022 年 8 月或之后可用的区域** 存储桶的示例策略：

            该策略向指定的日志传送服务授予权限。将此策略用于以下区域的可用区和本地区中的负载均衡器：

            - 亚太地区（海得拉巴）
            - 亚太地区（墨尔本）
            - 欧洲（西班牙）
            - 欧洲（苏黎世）
            - 中东（阿联酋）

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
-->

[alb-permission]: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
[alb-headless-authentication-client]: https://github.com/aws-samples/alb-headless-authentication-client
