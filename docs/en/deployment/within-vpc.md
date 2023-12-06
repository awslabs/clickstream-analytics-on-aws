# Launch within VPC

**Time to deploy**: Approximately 30 minutes

## Prerequisites

Review all the [considerations](../plan-deployment/cost.md) and make sure you have the following in the target region you want to deploy the solution:

- At least one Amazon VPC.
- At least two private (with NAT gateways or instances) [subnets][subnet] across two AZs.

## Deployment Overview

Use the following steps to deploy this solution on AWS.

[Step 1. Create OIDC client](#step-1-create-oidc-client)

[Step 2. Launch the stack](#step-2-launch-the-stack)

[Step 3. Update the callback url of OIDC client](#step-3-update-the-callback-url-of-oidc-client)

[Step 4. Launch the web console](#step-4-launch-the-web-console)

## Step 1. Create OIDC client

You can use existing OpenID Connect (OIDC) provider or following [this guide][oidc-clients] to create an OIDC client.

!!! tip "Tip"
    This solution deploys the console in VPC without requiring SSL certificate by default. You have to use an OIDC client to support callback url with `http` protocol.
## Step 2. Launch the stack

1. Sign in to the AWS Management Console and use the button below to launch the AWS CloudFormation template.

    |                                       | Launch in AWS Console                                                                                                                                                                                                                                                            |
    |----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------- |
    | Launch in AWS Regions       | [![Launch Stack][launch-stack]][standard-intranet-template-url]{target=_blank}                               |
    | Launch in AWS China Regions                 | [![Launch Stack][launch-stack]][cn-intranet-template-url]{target=_blank}                                 |

2. The template is launched in the default region after you log in to the console. To launch the {{ solution_name }} solution in a different AWS Region, use the Region selector in the console navigation bar.
3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.
4. On the **Specify stack details** page, assign a name to your solution stack. For information about naming character limitations, refer to [IAM and AWS STS quotas][iam-limits]{target='_blank'} in the *AWS Identity and Access Management User Guide*.
5. Under **Parameters**, review the parameters for the template and modify them as necessary.

    * This solution uses the following parameters:

    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | VpcId      | `<Requires input>` | Select the VPC in which the solution will be deployed. |
    | PrivateSubnets | `<Requires input>` | Select the subnets in which the solution will be deployed. **Note**: You must choose two subnets across two AZs at least. |
    | OIDCClientId | `<Requires input>` | OpenID Connect client Id. |
    | OIDCProvider  | `<Requires input>` | OpenID Connect provider issuer. The issuer must begin with `https://` |
    | Email | `<Requires input>` | Specify the email of the Administrator. |

6. Choose **Next**.
7. On the **Configure stack options** page, choose **Next**.
8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.
9. Choose **Create stack**  to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 10 minutes.

## Step 3. Update the callback URL of OIDC client

1. Sign in to the [AWS CloudFormation console][cloudformation]{target='_blank'}.
2. Select the solution's stack.
3. Choose the **Outputs** tab.
4. Obtain the **ControlPlaneURL** as the endpoint.
5. Update or add the callback URL **${ControlPlaneURL}/signin** to your OIDC client.
    1. For Keycloak, add or update the url in **Valid Redirect URIs**.
    2. For Authing.cn, add or update the url in **Login Callback URL** of **Authentication Configuration**.

## Step 4. Launch the web console

!!! info "Important"

    Your login credentials is managed by the OIDC provider. Before signing in to the {{ solution_name }} console, make sure you have created at least one user in the OIDC provider's user pool.

1. Because you deploy the solution console in your VPC without public access, you have to setup a network connection to the solution console serving by an internal application load balancer. There are some options for your reference.
      1. (Option 1) Use bastion host, for example, [Linux Bastion Hosts on AWS][linux-bastion] solution
      2. (Option 2) Use [AWS Client VPN][client-vpn] or [AWS Site-to-Site VPN][site-to-site-vpn]
      3. (Option 3) Use [AWS Direct Connect][dx]
2. The application load balancer only allows the traffic from specified security group, you can find the security group id from the output named **SourceSecurityGroup** from the stack you deployed in step 2. Then attach the security group to your bastion host or other source to access the solution console.
3. Use the previously assigned domain name or the generated **ControlPlaneURL** in a web browser.
4. Choose **Sign In**, and navigate to OIDC provider.
5. Enter sign-in credentials. You may be asked to change your default password for first-time login, which depends on your OIDC provider's policy.
6. After the verification is complete, the system opens the {{ solution_name }} web console.

Once you have logged into the {{ solution_name }} console, you can start to [create a project][create-project] for your applications.

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
