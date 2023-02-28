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

All AWS regions and AWS China regions

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
# deploy the control plane of the solution within a newly created VPC
npx cdk deploy public-new-vpc-control-plane-stack
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