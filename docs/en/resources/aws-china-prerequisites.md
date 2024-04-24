# Prerequisites for AWS China regions

Before you can deploy the solution in AWS China regions, there are additional prerequisites that you need to meet compared to [the prerequisites for AWS standard regions][deployment-prerequisites].

## Web console prerequisites

- You must have already applied for [ICP recordal for the AWS China account][icp] through SINNET or NWCD.
- You should also prepare an OIDC client for the authentication of the web console. Please refer to [this document][oidc-client] for the steps taken by a few well-known OIDC providers.
- (only apply for [deploying the solution publicly][oidc].) You need to have a domain name with ICP recordal and have the authorization to record the new DNS record as the domain name of the web console. You must apply for a valid SSL certificate for the domain name of the web console and follow [this guide][ssl-upload] to upload the certificate to AWS IAM.

## Data pipeline prerequisites

- (only apply for [enabling the reporting feature][reporting].) You need to [sign up for a QuickSight Enterprise subscription][quicksight-signup] first. Also, you need to [create at least one admin user for your QuickSight][quicksight-manage-users] before deploying the data pipeline in the solution's web console.

[icp]: https://www.amazonaws.cn/en/support/icp/?nc2=h_l2_su
[oidc-client]: ../deployment/with-oidc.md#step-1-create-oidc-client
[oidc]: ../deployment/with-oidc.md
[ssl-upload]: ./upload-ssl-certificate.md
[deployment-prerequisites]: ../deployment/index.md#prerequisites
[quicksight-signup]: https://docs.amazonaws.cn/en_us/quicksight/latest/user/setting-up-sso.html
[reporting]: ../pipeline-mgmt/quicksight/configure-quicksight.md
[quicksight-manage-users]: https://docs.amazonaws.cn/en_us/quicksight/latest/user/managing-user-access-idc.html#view-user-accounts-enterprise