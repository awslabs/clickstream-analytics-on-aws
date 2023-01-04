import { Link } from '@cloudscape-design/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

const InfoLink: React.FC = () => {
  const { t } = useTranslation();
  return <Link variant="info">{t('info')}</Link>;
};

export default InfoLink;
