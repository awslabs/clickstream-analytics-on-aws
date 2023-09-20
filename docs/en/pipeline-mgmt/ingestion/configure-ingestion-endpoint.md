# Ingestion endpoint settings
The solution creates a web service as an ingestion endpoint to collect data sent from your SDKs. You can set below configurations for ingestion endpoint.

* **Public Subnets**: select at least two existing VPC public subnets, and the Amazon Application Load Balancers (ALBs) will be deployed in these subnets.

* **Private Subnets**: select at least two existing VPC private subnets, and the EC2 instances running in ECS will be deployed in these subnets.

    !!! tip "Tip"

        The availability zones where the public subnets are located must be consistent with those of the private subnets.

* **Ingestion capacity**: This configuration sets the capacity of the ingestion server, and the ingestion server will automatically scale up or down based on the utilization of the processing CPU.
    * Minimum capacity: The minimum capacity to which the ingestion server will scale down.
    * Maximum capacity: The maximum capacity to which the ingestion server will scale up.
    * Warm pool: Warm pool gives you the ability to decrease latency for your applications that have exceptionally long boot time. For more information, please refer to [Warm pools for Amazon EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html).

* **Enable HTTPS**: Users can choose HTTPS/HTTP protocol for the Ingestion endpoint.
    * Enable HTTPS: If users choose to enable HTTPS, the ingestion server will provide HTTPS endpoint. 
        * Domain name: input a domain name. Once the ingestion server is created, use the custom endpoint to create an alias or CNAME mapping in your Domain Name System (DNS) for the custom endpoint. 
        * SSL Certificate: User need to select an ACM certificate corresponding to the domain name that you input. If there is no ACM certificate, please refer [create public certificate](https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request-public.html) to create it.
    * Disable HTTPS: If users choose to disable HTTPS, the ingestion server will provide HTTP endpoint.

        !!! warning "Warning"

            Using HTTP protocol is not secure, because data will be sent without any encryption, and there are high risks of data being leaked or tampered during transmission. Please acknowledge the risk to proceed.
* **Cross-Origin Resource Sharing (CORS)**: You can enable CORS to limit requests to data ingestion API from a specific domain. Note that, you need to input a complete internet address, e.g., https://www.example.com, http://localhost:8080. Use comma to separate domain if you have multiple domain for this setting.

        !!! warning "Warning"

            CORS is a mandatory setting if you are collecting data from a website. If you do not set value for this parameter, the ingestion server to reject all the requests from Web platform.

* Additional Settings
    * Request path: User can input the path of ingestion endpoint to collect data, the default path is "/collect".
    * AWS Global Accelerator: User can choose to create an accelerator to get static IP addresses that act as a global fixed entry point to your ingestion server, which will improves the availability and performance of your ingestion server. 
      **Note** That additional charges apply.
    * Authentication: User can use OIDC provider to authenticate the request sent to your ingestion server. If you plan to enable it, please create an OIDC client in the OIDC provider then create a secret in AWS Secret Manager with information:
        * issuer
        * token endpoint
        * User endpoint
        * Authorization endpoint
        * App client ID
        * App Client Secret

        The format is like:
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
      **Note**: In the OIDC provider, you need to add `https://<ingestion server endpoint>/oauth2/idpresponse` to "Allowed callback URLs"

    * Access logs: ALB supports delivering detailed logs of all requests it receives. If you enable this option, the solution will automatically enable access logs for you and store the logs into the S3 bucket you selected in previous step.

        !!! tip "Tip"

            The bucket must have [a bucket policy that grants Elastic Load Balancing permission][alb-permission] to write to the bucket.

            Below is an example policy for the bucket in **regions available before August 2022**,

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

            Replace `elb-account-id` with the ID of the AWS account for Elastic Load Balancing for your Region:

            - US East (N. Virginia) – 127311923021
            - US East (Ohio) – 033677994240
            - US West (N. California) – 027434742980
            - US West (Oregon) – 797873946194
            - Africa (Cape Town) – 098369216593
            - Asia Pacific (Hong Kong) – 754344448648
            - Asia Pacific (Jakarta) – 589379963580
            - Asia Pacific (Mumbai) – 718504428378
            - Asia Pacific (Osaka) – 383597477331
            - Asia Pacific (Seoul) – 600734575887
            - Asia Pacific (Singapore) – 114774131450
            - Asia Pacific (Sydney) – 783225319266
            - Asia Pacific (Tokyo) – 582318560864
            - Canada (Central) – 985666609251
            - Europe (Frankfurt) – 054676820928
            - Europe (Ireland) – 156460612806
            - Europe (London) – 652711504416
            - Europe (Milan) – 635631232127
            - Europe (Paris) – 009996457667
            - Europe (Stockholm) – 897822967062
            - Middle East (Bahrain) – 076674570225
            - South America (São Paulo) – 507241528517
            - China (Beijing) – 638102146993
            - China (Ningxia) – 037604701340

<!--
            Below is an example policy for the bucket in **regions available as of August 2022 or later**,

            This policy grants permissions to the specified log delivery service. Use this policy for load balancers in Availability Zones in the following Regions:

            - Asia Pacific (Hyderabad)
            - Asia Pacific (Melbourne)
            - Europe (Spain)
            - Europe (Zurich)
            - Middle East (UAE)

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