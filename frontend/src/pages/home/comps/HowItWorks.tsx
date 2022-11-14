import {
  Box,
  ColumnLayout,
  Container,
  Header,
} from '@cloudscape-design/components';
import React from 'react';

const HowItWorks: React.FC = () => {
  return (
    <Container header={<Header variant="h2">How it works</Header>}>
      <ColumnLayout columns={3} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">Step 1.</Box>
          <Box variant="awsui-key-label">Create a project</Box>
          <div>
            A project is a container for your Apple, Android, and Web apps. Apps
            in the project will share the same data \n .
          </div>
        </div>
        <div>
          <Box variant="awsui-key-label">Step 2.</Box>
          <Box variant="awsui-key-label">Create a pipeline</Box>
          <div>
            A pipeline is a set of data processing modules that collect and
            transform your clickstream data into your desired format
          </div>
        </div>
        <div>
          <Box variant="awsui-key-label">Step 3.</Box>
          <Box variant="awsui-key-label">Register apps</Box>
          <div>
            Add apps to your project, and follow the guidance to integrate SDK
            into your apps
          </div>
        </div>
      </ColumnLayout>
    </Container>
  );
};

export default HowItWorks;
