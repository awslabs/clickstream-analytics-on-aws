# Clickstream Analytics on AWS

An AWS Solution builds clickstream analytic system on AWS with a click-through experience. 
This solution automates the data pipeline creation per configurations, 
and provides SDKs for web and mobiles apps to help users to collect and ingest client-side data into the data pipeline on AWS. 
The solution allows you to further enrich, model, and distribute the event data for business function teams (e.g., marketing, operation) to consume, 
and provides a dozen of built-in visualizations (e.g., acquisition, engagement, retention, user demographic) 
and explorative reporting templates (e.g., funnel, use path, user explorer), 
powering the use cases such as user behavior analytics, marketing analytics, and product analytics.

## Architecutre of solution

TBA

## How to deploy the solution

### Regions

**Supported regions for control plane**

| Region Name                               | Launch with Cognito User Pool         | Launch with OpenID Connect            |
|-------------------------------------------|---------------------------------------|---------------------------------------|
| US East (N. Virginia)                     | Yes  | Yes  |
| US East (Ohio)                            | Yes  | Yes  |
| US West (N. California)                   | Yes  | Yes  |
| US West (Oregon)                          | Yes  | Yes  |
| Africa (Cape Town)                        | No   | Yes  |
| Asia Pacific (Hong Kong)                  | No   | Yes  |
| Asia Pacific (Hyderabad)                  | No   | Yes  |
| Asia Pacific (Jakarta)                    | No   | Yes  |
| Asia Pacific (Melbourne)                  | No   | Yes  |
| Asia Pacific (Mumbai)                     | Yes  | Yes  |
| Asia Pacific (Osaka)                      | No   | Yes  |
| Asia Pacific (Seoul)                      | Yes  | Yes  |
| Asia Pacific (Singapore)                  | Yes  | Yes  |
| Asia Pacific (Sydney)                     | Yes  | Yes  |
| Asia Pacific (Tokyo)                      | Yes  | Yes  |
| Canada (Central)                          | Yes  | Yes  |
| Europe (Frankfurt)                        | Yes  | Yes  |
| Europe (Ireland)                          | Yes  | Yes  |
| Europe (London)                           | Yes  | Yes  |
| Europe (Milan)                            | No   | Yes  |
| Europe (Paris)                            | Yes  | Yes  |
| Europe (Spain)                            | No   | Yes  |
| Europe (Stockholm)                        | Yes  | Yes  |
| Europe (Zurich)                           | No   | Yes  |
| Middle East (Bahrain)                     | Yes  | Yes  |
| Middle East (UAE)                         | No   | Yes  |
| South America (Sao Paulo)                 | Yes  | Yes  |
| China (Beijing) Region Operated by Sinnet | No   | Yes  |
| China (Ningxia) Regions operated by NWCD  | No   | Yes  |

**Supported regions for clickstream analytics pipeline**
| Region Name                               | Launch with pipeline         | Launch with dashboard            |
|-------------------------------------------|------------------------------|----------------------------------|
| US East (N. Virginia)                     | Yes  | Yes  |
| US East (Ohio)                            | Yes  | Yes  |
| US West (Oregon)                          | Yes  | Yes  |
| Asia Pacific (Mumbai)                     | Yes  | Yes  |
| Asia Pacific (Seoul)                      | Yes  | Yes  |
| Asia Pacific (Singapore)                  | Yes  | Yes  |
| Asia Pacific (Sydney)                     | Yes  | Yes  |
| Asia Pacific (Tokyo)                      | Yes  | Yes  |
| Canada (Central)                          | Yes  | Yes  |
| Europe (Frankfurt)                        | Yes  | Yes  |
| Europe (Ireland)                          | Yes  | Yes  |
| Europe (London)                           | Yes  | Yes  |
| Europe (Paris)                            | Yes  | Yes  |
| Europe (Stockholm)                        | Yes  | Yes  |
| South America (Sao Paulo)                 | Yes* | Yes  |

*: Redshift serverless is not supported

### Quick deployment

TBA

### Deploy from source

#### Prerequisites

- An AWS account
- Configure [credential of aws cli][configure-aws-cli]
- Install node.js LTS version 16.18.0 at least
- Install Docker Engine
- Install the dependencies of solution via executing command `yarn install --check-files && npx projen`
- Initialize the CDK toolkit stack into AWS environment(only for deploying via [AWS CDK][aws-cdk] first time), run `npx cdk bootstrap`

#### Deploy it
```shell
# deploy the control plane of the solution 
npx cdk deploy cloudfront-s3-control-plane-stack-global
```

## How to test
```shell
yarn test
```

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This project is licensed under the Apache-2.0 License.

[configure-aws-cli]: https://docs.aws.amazon.com/zh_cn/cli/latest/userguide/cli-chap-configure.html
[aws-cdk]: https://aws.amazon.com/cdk/