import {
  Box,
  ColumnLayout,
  Container,
  Header,
} from '@cloudscape-design/components';
import React from 'react';

const BenefitsFeatures: React.FC = () => {
  return (
    <Container header={<Header variant="h2">Benefits and features</Header>}>
      <ColumnLayout columns={2} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">Easy to use</Box>
          <div>
            With a few clicks on a web-base console, you can create an
            end-to-end analytic platform and start analyzing your data.
          </div>
        </div>
        <div>
          <Box variant="awsui-key-label">A single pane of glass view</Box>
          <div>
            Manage all resources in a single place, provides built-in monitors
            and alarms that gives you full visibility into your data pipelines
            and underlining AWS resources.
          </div>
        </div>
        <div>
          <Box variant="awsui-key-label">Flexible</Box>
          <div>
            Modularized components with rich customization options for you to
            assessemble a data pipeline that tailored to your needs.
          </div>
        </div>
        <div>
          <Box variant="awsui-key-label">Well-architected</Box>
          <div>
            The solution is built based on AWS best practices, providing you
            production-level scalability and cost-effitiveness.
          </div>
        </div>
      </ColumnLayout>
    </Container>
  );
};

export default BenefitsFeatures;
