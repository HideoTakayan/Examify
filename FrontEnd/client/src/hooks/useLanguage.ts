import { useTranslation } from "react-i18next";

export const LANG_STORAGE_KEY = 'app_language';

export const APP_LANGUAGES = {
  vi: { label: 'Tiếng Việt', shortLabel: 'Việt', flag: '🇻🇳' },
  en: { label: 'English', shortLabel: 'EN', flag: '🇺🇸' },
  ja: { label: '日本語', shortLabel: '日本', flag: '🇯🇵' },
} as const;

export type AppLanguage = keyof typeof APP_LANGUAGES;

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const language = (i18n.resolvedLanguage ?? 'vi') as AppLanguage;

  const changeLanguage = async (lang: AppLanguage) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  };
  return {
    language,
    changeLanguage,
  };
};
