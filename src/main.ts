import { App, Stack, StackProps, Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { Construct } from 'constructs';

export class ClickstreamAnalyticsStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // define resources here...
  }
}


const app = new App();

new ClickstreamAnalyticsStack(app, 'clickstream-analytics-on-aws');

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));