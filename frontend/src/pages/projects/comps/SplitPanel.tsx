import { Box, ColumnLayout, SplitPanel } from '@cloudscape-design/components';
import React from 'react';

export const SPLIT_PANEL_I18NSTRINGS = {
  preferencesTitle: 'Split panel preferences',
  preferencesPositionLabel: 'Split panel position',
  preferencesPositionDescription:
    'Choose the default split panel position for the service.',
  preferencesPositionSide: 'Side',
  preferencesPositionBottom: 'Bottom',
  preferencesConfirm: 'Confirm',
  preferencesCancel: 'Cancel',
  closeButtonAriaLabel: 'Close panel',
  openButtonAriaLabel: 'Open panel',
  resizeHandleAriaLabel: 'Resize split panel',
};
const SplitPanelContent: React.FC = () => {
  return (
    <SplitPanel header="Project-01" i18nStrings={SPLIT_PANEL_I18NSTRINGS}>
      <ColumnLayout columns={2} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">Project ID</Box>
          <div className="mb-10">Project-01</div>
          <Box variant="awsui-key-label">App Platform</Box>
          <div className="mb-10">Web</div>
          <Box variant="awsui-key-label">Creation Time</Box>
          <div className="mb-10">2022-11-11 18:23:44</div>
          <Box variant="awsui-key-label">Notification Email</Box>
          <div className="mb-10">example@example.com</div>
        </div>
        <div>
          <Box variant="awsui-key-label">Enviroment Type</Box>
          <div className="mb-10">Production</div>
          <Box variant="awsui-key-label">Project Number</Box>
          <div className="mb-10">12345678901</div>
          <Box variant="awsui-key-label">Key</Box>
          <div className="mb-10">Key 01</div>
          <Box variant="awsui-key-label">Key 2</Box>
          <div className="mb-10">Key 2 Value</div>
        </div>
      </ColumnLayout>
    </SplitPanel>
  );
};

export default SplitPanelContent;
