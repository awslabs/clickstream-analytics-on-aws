# Upgrade the solution

!!! warning "Important"

    1. Please be advised that upgrading to this version directly from version 1.0.x is not supported. It is necessary to upgrade to [version 1.1.5][v115] first. 
    2. Upgrading from version 1.1.5 or any earlier 1.1 version will rebuild the default analysis dashboard and you will not be able to analyze previous data. If you need to migrate the existing data, it is imperative that you contact the AWS Clickstream team for support through your sales representative.

## Upgrade Process

### Upgrade web console stack

1. Log in to [AWS CloudFormation console][cloudformation], select your existing [web console stack][console-stack], and choose **Update**.
2. Select **Replace current template**.
3. Under **Specify template**:
    - Select Amazon S3 URL.
    - Refer to the table below to find the link for your deployment type.
    - Paste the link in the Amazon S3 URL box.
    - Choose **Next** again.

    | Template      | Description                          |
    | :---------- | :----------------------------------- |
    | [Use Cognito for authentication][cloudfront-s3-template]     | Deploy as public service in AWS regions  |
    | [Use Cognito for authentication with custom domain][cloudfront-s3-custom-domain-template]     | Deploy as public service with custom domain in AWS regions  |
    | [Use OIDC for authentication][cloudfront-s3-oidc-template]   | Deploy as public service in AWS regions  |
    | [Use OIDC for authentication with custom domain][cloudfront-s3-oidc-custom-domain-template]    | Deploy as public service with custom domain in AWS regions  |
    | [Use OIDC for authentication within VPC][intranet-template]   | Deploy as private service within VPC in AWS regions  |
    | [Use OIDC for authentication with custom domain in AWS China][cloudfront-s3-oidc-cn-template]    | Deploy as public service with custom domain in AWS China regions  |
    | [Use OIDC for authentication within VPC in AWS China][intranet-cn-template]   | Deploy as private service within VPC in AWS China regions  |

4. Under **Parameters**, review the parameters for the template and modify them as necessary. Refer to [Deployment][console-stack] for details about the parameters.
5. Choose **Next**.
6. On the **Configure stack options** page, choose **Next**.
7. On the **Review** page, review and confirm the settings. Be sure to check the box acknowledging that the template might create (IAM) resources.
8. Choose **View change set** and verify the changes.
9. Choose **Execute change set** to deploy the stack.

You can view the status of the stack in the AWS CloudFormation console in the **Status** column. You should receive an `UPDATE_COMPLETE` status after a few minutes.

### Upgrade the pipeline of project

!!! info "Important"

    If you encounter any issues during the upgrade process, refer to [Troubleshooting][troubleshooting] for more information.

1. Log in to the web console of the solution.
2. Go to **Projects**, and choose the project to be upgraded.
3. Click on `project id` or **View Details** button, which will direct to the pipeline detail page.
4. In the project details page, click on the **Upgrade** button
5. You will be prompted to confirm the upgrade action.
6. Click on **Confirm**, the pipeline will be in `Updating` status.

You can view the status of the pipeline in the solution console in the **Status** column. After a few minutes, you can receive an Active status.

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
[v115]: https://awslabs.github.io/clickstream-analytics-on-aws/en/1.1.5/upgrade/