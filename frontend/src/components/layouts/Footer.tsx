import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer id="f">
      <ul>
        <li>
          <a href="/about/about-cloudscape/">{t('footer.about')}</a>
        </li>
        <li>
          <a href="/about/connect/">{t('footer.connect')}</a>
        </li>
        <li>
          © {new Date().getFullYear()}, {t('footer.copyRight')}
        </li>
      </ul>
    </footer>
  );
};

export default Footer;
