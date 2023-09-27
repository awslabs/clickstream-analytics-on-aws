import i18next from 'i18next';
import fsBackend from 'i18next-fs-backend';
import { logger } from './common/powertools';

i18next
  .use(fsBackend)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    backend: {
      loadPath: './locales/{{lng}}.json',
    },
  }).catch(err => {
    logger.error(`i18next init failed with error: ${err}`);
  });

export default i18next;