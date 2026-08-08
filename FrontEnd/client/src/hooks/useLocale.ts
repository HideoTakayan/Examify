import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { setDateLocale } from '@/locales';

const useLocale = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = i18n.resolvedLanguage || i18n.language;
    if (lang) {
      setDateLocale(lang);
    }
  }, [i18n, i18n.resolvedLanguage, i18n.language]);
};

export default useLocale;
