## Regional deployments

This solution uses services which may not be currently available in all AWS Regions. Launch this solution in an AWS Region where required services are available. For the most current availability by Region, refer to the [AWS Regional Services List][services].

Clickstream Analytics on AWS provides two types of authentication for its web console, [Cognito User Pool][cognito] and [OpenID Connect (OIDC) Provider][oidc]. You must choose to launch the solution with OpenID Connect in case one of the following scenarios:

- Cognito User Pool is not available in your AWS Region.
- You already have an OpenID Connect Provider and want to authenticate against it.

**Supported regions for web console deployment**

| Region Name                               | Launch with Cognito User Pool         | Launch with OpenID Connect           |
| ----------------------------------------- | ------------------------------------- | ------------------------------------ |
| US East (N. Virginia)                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| US East (Ohio)                            | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| US West (N. California)                   | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| US West (Oregon)                          | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Africa (Cape Town)                        | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| Asia Pacific (Hong Kong)                  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| Asia Pacific (Mumbai)                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Asia Pacific (Osaka)                      | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| Asia Pacific (Seoul)                      | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Asia Pacific (Singapore)                  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Asia Pacific (Sydney)                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Asia Pacific (Tokyo)                      | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Canada (Central)                          | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Europe (Frankfurt)                        | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Europe (Ireland)                          | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Europe (London)                           | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Europe (Milan)                            | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| Europe (Paris)                            | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Europe (Stockholm)                        | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| Middle East (Bahrain)                     | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| South America (Sao Paulo)                 | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| China (Beijing) Region Operated by Sinnet | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |
| China (Ningxia) Regions operated by NWCD  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check } |

This solution provides [modular components](../architecture.md) for supporting different data pipeline architecture. The data processing, data modeling and reporting modules are optional, that is, you can create a data pipeline without data processing, data modeling and reporting modules if needed.

**Pipeline modules availability**

| Region Name                               | Data ingestion with MSK as buffer    | Data ingestion with KDS as buffer    | Data ingestion with S3 as buffer     | Data processing                       | Data modeling with Redshift Serverless   | Data modeling with Provisioned Redshift  | Reporting with QuickSight             |
|-------------------------------------------|--------------------------------------|--------------------------------------|--------------------------------------|---------------------------------------|---------------------------------------|---------------------------------------|---------------------------------------|
| US East (N. Virginia)                     | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| US East (Ohio)                            | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| US West (N. California)                   | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } |
| US West (Oregon)                          | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Africa (Cape Town)                        | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| Asia Pacific (Hong Kong)                  | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } |
| Asia Pacific (Mumbai)                     | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Asia Pacific (Osaka)                      | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| Asia Pacific (Seoul)                      | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Asia Pacific (Singapore)                  | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Asia Pacific (Sydney)                     | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Asia Pacific (Tokyo)                      | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Canada (Central)                          | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Europe (Frankfurt)                        | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Europe (Ireland)                          | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Europe (London)                           | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Europe (Milan)                            | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } | :material-close-thick:{ .icon_cross } |
| Europe (Paris)                            | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Europe (Stockholm)                        | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| Middle East (Bahrain)                     | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } |
| South America (Sao Paulo)                 | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check }  |
| China (Beijing) Region Operated by Sinnet* | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  | :material-check-bold:{ .icon_check } |
| China (Ningxia) Region Operated by NWCD*  | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } | :material-check-bold:{ .icon_check }  | :material-close-thick:{ .icon_cross } |

!!! info "Note(*)"

    AWS China Regions don't support using AWS Global Accelerator to accelerate the ingestion endpoint.

[services]: https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/?nc1=h_ls
[cognito]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html
[oidc]: https://openid.net/connect/
[architecture]: ./architecture.md
