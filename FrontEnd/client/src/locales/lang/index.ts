import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './common/en.json';
import vi from './common/vi.json';
import ja from './common/ja.json';

import errEn from './errors/en.json';
import errVi from './errors/vi.json';
import errJa from './errors/ja.json';
import { paginationByLang } from './pagination';

const LANG_STORAGE_KEY = 'app_language';
const SUPPORTED_LANGS = ['vi', 'en', 'ja'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGS)[number];

function normalizeLanguage(lng: string | null | undefined): AppLanguage {
  if (!lng) return 'vi';
  const base = lng.toLowerCase().split('-')[0];
  if (base === 'en' || base === 'ja' || base === 'vi') return base;
  return 'vi';
}

const savedLanguage = normalizeLanguage(
  typeof window !== 'undefined' ? localStorage.getItem(LANG_STORAGE_KEY) : null,
);

function buildTranslation(
  common: Record<string, unknown>,
  errors: Record<string, unknown>,
  lang: AppLanguage,
) {
  return {
    ...common,
    errors,
    pagination: {
      ...(typeof common.pagination === 'object' && common.pagination !== null
        ? common.pagination
        : {}),
      ...paginationByLang[lang],
    },
  };
}

const resources = {
  en: {
    translation: buildTranslation(en, errEn, 'en'),
  },
  vi: {
    translation: buildTranslation(vi, errVi, 'vi'),
  },
  ja: {
    translation: buildTranslation(ja, errJa, 'ja'),
  },
};

void i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  supportedLngs: [...SUPPORTED_LANGS],
  nonExplicitSupportedLngs: false,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
