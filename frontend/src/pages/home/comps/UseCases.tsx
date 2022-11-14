import {
  Box,
  ColumnLayout,
  Container,
  Header,
} from '@cloudscape-design/components';
import React from 'react';

const UseCases: React.FC = () => {
  return (
    <div className="mt-20">
      <Container header={<Header variant="h2">Use cases</Header>}>
        <ColumnLayout columns={2} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">User Behavior Analytics</Box>
            <div>
              Collecting, tracking, reviewing and reporting data to measure user
              activities on the websites or mobile apps, generating metrics and
              dashboard to improve website and app performance.
            </div>
          </div>
          <div>
            <Box variant="awsui-key-label">Customer Data Platform</Box>
            <div>
              Collect event data generated from all customers across the
              internet, then clean, enrich and transform data tp load into
              Customer Data Lake for joining with other data sources for further
              analytics.
            </div>
          </div>
        </ColumnLayout>
      </Container>
    </div>
  );
};

export default UseCases;
