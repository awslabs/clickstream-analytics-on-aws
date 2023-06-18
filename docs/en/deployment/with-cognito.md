# Launch with Cognito User Pool

**Time to deploy**: Approximately 15 minutes

## Deployment Overview

Use the following steps to deploy this solution on AWS.

[Step 1. Launch the stack](#step-1-launch-the-stack)

[Step 2. Launch the web console](#step-2-launch-the-web-console)

## Step 1. Launch the stack

This AWS CloudFormation template automatically deploys the {{ solution_name }} solution on AWS.

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/) and select the button to launch the AWS CloudFormation template.

    |                             | Launch in AWS Console                                                                                                                                                                                                                                   |
    |---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------ |
    | Launch stack      | [![Launch Stack][launch-stack]][cloudfront-cognito-template-url]{target=_blank}              |
    | Launch stack with custom domain     | [![Launch Stack][launch-stack]][cloudfront-cognito-custom-domain-template-url]{target=_blank}              |

2. The template is launched in the default region after you log in to the console. To launch the {{ solution_name }} solution in a different AWS Region, use the Region selector in the console navigation bar.

3. On the **Create stack** page, verify that the correct template URL is shown in the **Amazon S3 URL** text box and choose **Next**.

4. On the **Specify stack details** page, assign a name to your solution stack. For information about naming character limitations, refer to [IAM and AWS STS quotas][iam-limits]{target='_blank'} in the *AWS Identity and Access Management User Guide*.

5. Under **Parameters**, review the parameters for the template and modify them as necessary.

     - This solution uses the following parameters:

    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | Admin User Email | `<Requires input>` | Specify the email of the Administrator. This email address will receive a temporary password to access the {{ solution_name }} web console. You can create more users directly in the provisioned Cognito User Pool after launching the solution. |

    !!! Note "Note"
        By default, this deployment uses TLSv1.0 in CloudFront. However, you can manually configure CloudFront to use the more secure TLSv1.2 after applying for a certificate and custom domain.

    - If you are launching the solution with custom domain in AWS regions, this solution uses the additional following parameters:

    | Parameter  | Default          | Description                                                  |
    | ---------- | ---------------- | ------------------------------------------------------------ |
    | Hosted Zone ID | `<Requires input>` | Choose the public hosted zone ID of Amazon Route 53. |
    | Hosted Zone Name | `<Requires input>` | The domain name of the public hosted zone, for example, `example.com`. |
    | Record Name | `<Requires input>` | The sub name (as known as record name in R53) of the domain name of console. For example, enter `clickstream`, if you want to use custom domain `clickstream.example.com` for the console. |

6. Choose **Next**.

7. On the **Configure stack options** page, choose **Next**.

8. On the **Review** page, review and confirm the settings. Select the box acknowledging that the template creates AWS Identity and Access Management (IAM) resources.

9. Choose **Create stack** to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive a **CREATE_COMPLETE** status in approximately 15 minutes.

## Step 2. Launch the web Console

After the stack is successfully created, this solution generates a CloudFront domain name that gives you access to the {{ solution_name }} web console.
Meanwhile, an auto-generated temporary password will be sent to your email address.

1. Sign in to the [AWS CloudFormation console][cloudformation]{target='_blank'}.

2. On the **Stacks** page, select the solution’s stack.

3. Choose the **Outputs** tab and record the domain name.

4. Open the **ControlPlaneURL** using a web browser, and navigate to a sign-in page.

5. Enter the **Email** and the temporary password.

    a. Set a new account password.

    b. (Optional) Verify your email address for account recovery.

6. After the verification is complete, the system opens the {{ solution_name }} web console.

Once you have logged into the {{ solution_name }} console, you can start to [create a project][create-project] for your applications.

[launch-stack]: ../images/launch-stack.webp
[cloudfront-cognito-template-url]: https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global.template.json
[cloudfront-cognito-custom-domain-template-url]: https://console.aws.amazon.com/cloudformation/home#/stacks/new?templateURL=https://{{ aws_bucket }}.s3.amazonaws.com/{{ aws_prefix }}/{{ aws_version }}/cloudfront-s3-control-plane-stack-global-customdomain.template.json
[iam-limits]: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-limits.html
[cloudformation]: https://console.aws.amazon.com/cloudformation/
[create-project]: ../getting-started/1.create-project.md
