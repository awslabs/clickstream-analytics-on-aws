# Overview

Before you launch the solution, review the architecture, supported regions, and other considerations discussed in this guide. Follow the step-by-step instructions in this section to configure and deploy the solution into your account.

## Prerequisites

Review all the [considerations](../plan-deployment/cost.md) and make sure you have the following in the target Region you want to deploy the solution:

- At least two vacant S3 buckets.

## Deployment in AWS Regions

{{ solution_name }} provides two ways to authenticate and log into the solution web console. For some AWS Regions where Cognito User Pool is unavailable (for example, Hong Kong), you must launch the solution with OpenID Connect.

- [Launch with Cognito User Pool][cognito]. _(Fastest way to get started, suitable for most AWS regions)_
- [Launch with OpenID Connect][oidc]

For more information about supported regions, see [Regional deployments](../plan-deployment/regions.md).

## Deployment in AWS China Regions

AWS China Regions do not have Cognito User Pool. You must launch the solution with OpenID Connect.

- [Launch with OpenID Connect][oidc]

## Deployment within Amazon VPC

{{ solution_name }} supports being deployed into an Amazon VPC, allowing access to the web console without leaving your VPC network.

- [Launch within VPC][intranet]

[cognito]: ./with-cognito.md
[oidc]: ./with-oidc.md
[intranet]: ./within-vpc.md
