import dayjs from 'dayjs';

export const dateLocales: Record<string, () => Promise<unknown>> = {
  en: () => import('dayjs/locale/en'),
  vi: () => import('dayjs/locale/vi'),
  ja: () => import('dayjs/locale/ja'),
};

export const setDateLocale = async (lang: string) => {
  await dateLocales[lang]?.();
  dayjs.locale(lang);
};
