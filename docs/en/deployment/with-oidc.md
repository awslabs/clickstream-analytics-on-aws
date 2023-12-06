# Launch with OpenID Connect (OIDC)

**Time to deploy**: Approximately 30 minutes

## Prerequisites

!!! info "Important"
    The {{ solution_name }} console is served via CloudFront distribution which is considered as an Internet information service.
    If you are deploying the solution in **AWS China Regions**, the domain must have a valid [ICP Recordal][icp].

* A domain. You will use this domain to access the {{ solution_name }} console. This is required for AWS China Regions, and is optional for AWS Regions.
* An SSL certificate in AWS IAM. The SSL must be associated with the given domain. Follow [this guide](../resources/upload-ssl-certificate.md) to upload SSL certificate to IAM. This is required for AWS China Regions only.

## Deployment Overview

Use the following steps to deploy this solution on AWS.

[Step 1. Create OIDC client](#step-1-create-oidc-client)

[Step 2. Launch the stack](#step-2-launch-the-stack)

[Step 3. Update the callback URL of OIDC client](#step-3-update-the-callback-url-of-oidc-client)

[Step 4. Set up DNS Resolver](#step-4-setup-dns-resolver)

[Step 5. Launch the web console](#step-5-launch-the-web-console)

## Step 1. Create OIDC client

You can use different kinds of OpenID Connect providers. This section introduces Option 1 to Option 4.

* (Option 1) Using Amazon Cognito from another region as OIDC provider.
* (Option 2) [Authing][authing]{target="_blank"}, which is an example of a third-party authentication provider.
* (Option 3) [Keycloak][keycloak-solution]{target="_blank"}, which is a solution maintained by AWS and can serve as an authentication identity provider.
* (Option 4) [ADFS][adfs]{target="_blank"}, which is a service offered by Microsoft.
* (Option 5) Other third-party authentication platforms such as [Auth0][auth0]{target="_blank"}.

Follow the steps below to create an OIDC client, and obtain the `client_id` and `issuer`.

### (Option 1) Using Cognito User Pool from another region

You can leverage the [Cognito User Pool][cognito] in a supported AWS Region as the OIDC provider.

1. Go to the [Amazon Cognito console][cognito-console] in an AWS Region.
2. Set up the hosted UI with the Amazon Cognito console based on this [guide][congnito-guide]. Please pay attentions to below two configurations
      - Choose **Public client** when selecting the **App type**. Make sure don't change the selection **Don't generate a client secret** for **Client secret**.
      - Add **Profile** in **OpenID Connect scopes**.
3. Enter the **Callback URL** and **Sign out URL** using your domain name for {{ solution_name }} console as the following:
      -  **Callback URL**: `http[s]://<domain-name>/signin`
      -  **Sign out URL**: `http[s]://<domain-name>`

    !!! info "Note"
        If you're not using custom domain for the console, you don't know the domain name of console. You can input a fake one, for example, `clickstream.example.com`. Then update it following guidelines in Step 3.

4. If your hosted UI is set up, you should be able to see something like below.

       ![cognito host ui](../images/OIDC/cognito-hostUI-new.jpeg)

5. Save the App client ID, User pool ID and the AWS Region to a file, which will be used later.

       ![cognito client id](../images/OIDC/cognito-new-console-clientID.png)
       ![cognito userpool id](../images/OIDC/cognito-new-console-userpoolID.png)

In [Step 2. Launch the stack](#step-2-launch-the-stack), enter the parameters below from your Cognito User Pool.

- **OIDCClientId**: `App client ID`
- **OIDCProvider**: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`

### (Option 2) Authing.cn OIDC client

1. Go to the [Authing console][authing-console]{target=_blank}.
2. Create a user pool if you don't have one.
3. Select the user pool.
4. On the left navigation bar, select **Self-built App** under **Applications**.
5. Click the **Create** button.
6. Enter the **Application Name**, and **Subdomain**.
7. Save the `App ID` (that is, `client_id`) and `Issuer` to a text file from Endpoint Information, which will be used later.

    ![authing endpoint info](../images/OIDC/authing-endpoint-info.png)

8. Update the `Login Callback URL` and `Logout Callback URL`, note that you need to add **`/signin`** to your domain name for `Login Callback URL` as follow:
      -  **Callback URL**: `http[s]://<domain-name>/signin`
      -  **Sign out URL**: `http[s]://<domain-name>`

9. Set the Authorization Configuration.

    ![authing authorization configuration](../images/OIDC/authing-authorization-configuration.png)

You have successfully created an authing self-built application.

In [Step 2. Launch the stack](#step-2-launch-the-stack), enter the parameters below from your Authing user pool.

- **OIDCClientId**: `client id`
- **OIDCProvider**: `Issuer`

### (Option 3) Keycloak OIDC client

1. Deploy the Keycloak solution in AWS China Regions following [this guide][keycloak-deployment-guide]{target='_blank'}.

2. Sign in to the Keycloak console.

3. On the left navigation bar, select **Add realm**. Skip this step if you already have a realm.

4. Go to the realm setting page. Choose **Endpoints**, and then **OpenID Endpoint Configuration** from the list.

    ![keycloak realm](../images/OIDC/keycloak-example-realm.png)

5. In the JSON file that opens up in your browser, record the **issuer** value which will be used later.

    ![keycloak oidc config](../images/OIDC/keycloak-OIDC-config.png)

6. Go back to Keycloak console and select **Clients** on the left navigation bar, and choose **Create**.
7. Enter a Client ID, which must contain letters (case-insensitive) or numbers. Record the **Client ID** which will be used later.
8. Change client settings. Enter `http[s]://<{{ solution_name }} Console domain>/signin` in **Valid Redirect URIs**，and enter `<console domain>` and `+` in **Web Origins**.

    !!! tip "Tip"
        If you're not using custom domain for the console, the domain name of console is not available yet. You can enter a fake one, for example, `clickstream.example.com`, and then update it following guidelines in Step 3.

9. In the Advanced Settings, set the **Access Token Lifespan** to at least 5 minutes.
10. Select **Users** on the left navigation bar.
11. Click **Add user** and enter **Username**.
12. After the user is created, select **Credentials**, and enter **Password**.

In [Step 2. Launch the stack](#step-2-launch-the-stack), enter the parameters below from your Keycloak realm.

- **OIDCClientId**: `client id`
- **OIDCProvider**: `https://<KEYCLOAK_DOMAIN_NAME>/auth/realms/<REALM_NAME>`

### (Option 4) ADFS OpenID Connect Client

1. Make sure your ADFS is installed. For information about how to install ADFS, refer to [this guide][ad-fs-deployment-guide].
2. Make sure you can log in to the ADFS Sign On page. The URL should be `https://adfs.domain.com/adfs/ls/idpinitiatedSignOn.aspx`, and you need to replace **adfs.domain.com** with your real ADFS domain.
3. Log on your **Domain Controller**, and open **Active Directory Users and Computers**.
4. Create a **Security Group** for {{ solution_name }} Users, and add your planned {{ solution_name }} users to this Security Group.

5. Log on to ADFS server, and open **ADFS Management**.

6. Right click **Application Groups**, choose **Application Group**, and enter the name for the Application Group. Select **Web browser accessing a web application** option under **Client-Server Applications**, and choose **Next**.

7. Record the **Client Identifier** (`client_id`) under **Redirect URI**, enter your {{ solution_name }} domain (for example, `xx.example.com`), and choose **Add**, and then choose **Next**.

8. In the **Choose Access Control Policy** window, select **Permit specific group**, choose **parameters** under Policy part, add the created Security Group in Step 4, then click **Next**. You can configure other access control policy based on your requirements.

9. Under Summary window, choose **Next**, and choose **Close**.
10. Open the Windows PowerShell on ADFS Server, and run the following commands to configure ADFS to allow CORS for your planned URL.

    ```shell
    Set-AdfsResponseHeaders -EnableCORS $true
    Set-AdfsResponseHeaders -CORSTrustedOrigins https://<your-{{ solution }}-domain>
    ```

11. Under Windows PowerShell on ADFS server, run the following command to get the Issuer (`issuer`) of ADFS, which is similar to `https://adfs.example.com/adfs`.

    ```shell
    Get-ADFSProperties | Select IdTokenIssuer
    ```

    ![get adfs properties](../images/OIDC/adfs-9.png)

In [Step 2. Launch the stack](#step-2-launch-the-stack), enter the parameters below from your ADFS server.

- **OIDCClientId**: `client id`
- **OIDCProvider**: Get the server of the issuer from above step 11

## Step 2. Launch the stack

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/) and use the button below to launch the AWS CloudFormation template.

    |                                       | Launch in AWS Console                                                                                                                                                                                                                                                            |
    |----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------- |
    | Launch in AWS Regions       | [![Launch Stack][launch-stack]][standard-oidc-template-url]{target=_blank}                               |
    | Launch with custom domain in AWS Regions       | [![Launch Stack][launch-stack]][standard-oidc-with-custom-domain-template-url]{target=_blank}                               |
    | Launch in AWS China Regions                 | [![Launch Stack][launch-stack]][cn-oidc-template-url]{target=_blank}                                 |

2. The template is launched in the default region after you log in to the console. To launch the {{ solution_name }} solution in a different AWS Region, use the Region selector in the console navigation bar.
3. On the **Create stack** page, verify that the correct template URL shows in the **Amazon S3 URL** text box and choose **Next**.
4. On the **Specify stack details** page, assign a name to your solution stack. For information about naming character limitations, refer to [IAM and AWS STS quotas][iam-limits]{target='_blank'} in the *AWS Identity and Access Management User Guide*.
5. Under **Parameters**, review the parameters for the template and modify them as necessary.

    * This solution uses the following parameters:

        | Parameter  | Default          | Description                                                  |
        | ---------- | ---------------- | ------------------------------------------------------------ |
        | OIDCClientId | `<Requires input>` | OpenID Connect client Id. |
        | OIDCProvider  | `<Requires input>` | OpenID Connect provider issuer. The issuer must begin with `https://` |
        | Email | `<Requires input>` | Specify the email of the Administrator. |

        !!! info "Important"
            {%
            include-markdown "./tls-note.md"
            %}

    * If you are launching the solution with custom domain in AWS Regions, this solution has the following additional parameters:

        | Parameter  | Default          | Description                                                  |
        | ---------- | ---------------- | ------------------------------------------------------------ |
        | Hosted Zone ID | `<Requires input>` | Choose the public hosted zone ID of Amazon Route 53. |
        | Hosted Zone Name | `<Requires input>` | The domain name of the public hosted zone, for example, `example.com`. |
        | Record Name | `<Requires input>` | The sub name (as known as record name in R53) of the domain name of console. For example, enter `clickstream` if you want to use custom domain `clickstream.example.com` for the console. |

    * If you are launching the solution in AWS China Regions, this solution has the following additional parameters:

        | Parameter  | Default          | Description                                                  |
        | ---------- | ---------------- | ------------------------------------------------------------ |
        | Domain | `<Requires input>` | Custom domain for {{ solution_name }} console. Do NOT add `http(s)` prefix. |
        | IamCertificateID | `<Requires input>` | The ID of the SSL certificate in IAM. The ID is composed of 21 characters of capital letters and digits. Use the [`list-server-certificates`][iam-list-cert]{target='_blank'} command to retrieve the ID. |

6. Choose **Next**.
7. On the **Configure stack options** page, choose **Next**.
8. On the **Review** page, review and confirm the settings. Check the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.
9. Choose **Create stack**  to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 10 minutes.

## Step 3. Update the callback URL of OIDC client

!!! info "Important"
    If you don't deploy stack with custom domain, you must complete below steps.

1. Sign in to the [AWS CloudFormation console][cloudformation]{target='_blank'}.
2. Select the solution's stack.
3. Choose the **Outputs** tab.
4. Obtain the **ControlPlaneURL** as the endpoint.
5. Update or add the callback URL to your OIDC.
    1. For Cognito, add or update the url in **Allowed callback URL** of your client with value `${ControlPlaneURL}/signin`. **NOTE**: The url must start with `https://`.
    2. For Keycloak, add or update the url in **Valid Redirect URIs** of your client with value `${ControlPlaneURL}/signin`.
    3. For Authing.cn, add or update the url in **Login Callback URL** of **Authentication Configuration**.

## Step 4. Setup DNS Resolver

!!! info "Important"
    If you deploy stack in AWS Regions, you can skip this step.

This solution provisions a CloudFront distribution that gives you access to the {{ solution_name }} console.

1. Sign in to the [AWS CloudFormation console](https://console.aws.amazon.com/cloudformation/){target='_blank'}.
2. Select the solution's stack.
3. Choose the **Outputs** tab.
4. Obtain the **ControlPlaneURL** and **CloudFrontDomainName**.
5. Create a CNAME record for **ControlPlaneURL** in DNS resolver, which points to the domain **CloudFrontDomainName** obtained in previous step.

## Step 5. Launch the web console

!!! info "Important"

    Your login credentials is managed by the OIDC provider. Before signing in to the {{ solution_name }} console, make sure you have created at least one user in the OIDC provider's user pool.

1. Use the previously assigned domain name or the generated **ControlPlaneURL** in a web browser.
2. Choose **Sign In**, and navigate to OIDC provider.
3. Enter sign-in credentials. You may be asked to change your default password for first-time login, which depends on your OIDC provider's policy.
4. After the verification is complete, the system opens the {{ solution_name }} web console.

Once you have logged into the {{ solution_name }} console, you can start to [create a project][create-project] for your applications.

[cognito]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html
[authing]: https://www.authing.cn/
[auth0]: https://auth0.com/
[icp]: https://www.amazonaws.cn/en/support/icp/?nc2=h_l2_su
[keycloak-solution]: https://github.com/aws-samples/keycloak-on-aws
[adfs]: https://docs.microsoft.com/en-us/windows-server/identity/active-directory-federation-services
[cognito-console]: https://console.aws.amazon.com/cognito/home
[congnito-guide]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-integration.html#cognito-user-pools-create-an-app-integration
[authing-console]: https://console.authing.cn/console
[keycloak-deployment-guide]: https://aws-samples.github.io/keycloak-on-aws/en/implementation-guide/deployment/
[ad-fs-deployment-guide]: https://docs.microsoft.com/en-us/windows-server/identity/ad-fs/deployment/ad-fs-deployment-guide
[launch-stack]: ../images/launch-stack.webp
[standard-oidc-template-url]: https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-oidc.template.json
[standard-oidc-with-custom-domain-template-url]: https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-customdomain-oidc.template.json
[cn-oidc-template-url]: https://console.amazonaws.cn/cloudformation/home#/stacks/new?templateURL=https://{{ aws_cn_bucket }}.s3.cn-north-1.amazonaws.com.cn/{{ aws_cn_prefix }}/{{ aws_cn_version }}/cloudfront-s3-control-plane-stack-cn.template.json
[iam-limits]: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html
[cloudformation]: https://console.aws.amazon.com/cloudformation/
[create-project]: ../getting-started/1.create-project.md
[iam-list-cert]: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html#list-server-certificates
