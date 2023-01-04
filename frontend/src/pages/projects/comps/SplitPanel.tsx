import { Box, ColumnLayout, SplitPanel } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const SplitPanelContent: React.FC = () => {
  const { t } = useTranslation();
  const SPLIT_PANEL_I18NSTRINGS = {
    preferencesTitle: t('splitPanel.preferencesTitle'),
    preferencesPositionLabel: t('splitPanel.preferencesPositionLabel'),
    preferencesPositionDescription: t(
      'splitPanel.preferencesPositionDescription'
    ),
    preferencesPositionSide: t('splitPanel.preferencesPositionSide'),
    preferencesPositionBottom: t('splitPanel.preferencesPositionBottom'),
    preferencesConfirm: t('splitPanel.preferencesConfirm'),
    preferencesCancel: t('splitPanel.preferencesCancel'),
    closeButtonAriaLabel: t('splitPanel.closeButtonAriaLabel'),
    openButtonAriaLabel: t('splitPanel.openButtonAriaLabel'),
    resizeHandleAriaLabel: t('splitPanel.resizeHandleAriaLabel'),
  };
  return (
    <SplitPanel header="Project-01" i18nStrings={SPLIT_PANEL_I18NSTRINGS}>
      <ColumnLayout columns={2} variant="text-grid">
        <div>
          <Box variant="awsui-key-label">{t('project:split.id')}</Box>
          <div className="mb-10">Project-01</div>
          <Box variant="awsui-key-label">{t('project:split.platform')}</Box>
          <div className="mb-10">Web</div>
          <Box variant="awsui-key-label">{t('project:split.created')}</Box>
          <div className="mb-10">2022-11-11 18:23:44</div>
          <Box variant="awsui-key-label">{t('project:split.notifyEmail')}</Box>
          <div className="mb-10">example@example.com</div>
        </div>
        <div>
          <Box variant="awsui-key-label">{t('project:split.envType')}</Box>
          <div className="mb-10">Production</div>
          <Box variant="awsui-key-label">{t('project:split.projectNo')}</Box>
          <div className="mb-10">12345678901</div>
        </div>
      </ColumnLayout>
    </SplitPanel>
  );
};

export default SplitPanelContent;
