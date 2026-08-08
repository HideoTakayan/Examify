import { LayoutTypes } from '@/@types/layout';

export type AppConfig = {
  apiPrefix: string;
  apiURL: string;
  authenticatedEntryPath: string;
  unAuthenticatedEntryPath: string;
  enableMock: boolean;
  locale: string;
  layoutType: LayoutTypes;
};
/** Production API when no `VITE_API_URL`. Dev server (`vite`) uses localhost unless overridden. */
const DEFAULT_PRODUCTION_API_URL = 'https://api.examify.local';

function looksLikeLocalApiUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function resolveApiUrl(): string {
  const raw =
    typeof import.meta.env.VITE_API_URL === 'string'
      ? import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '')
      : '';

  /** Đang mở app từ domain thật (vd. examify.local): không cho bundle/hosting nhầm nhúng localhost vào build. */
  const onPublicHostname =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  if (onPublicHostname) {
    if (!raw || looksLikeLocalApiUrl(raw)) {
      return DEFAULT_PRODUCTION_API_URL;
    }
    return raw;
  }

  if (raw) return raw;
  return import.meta.env.PROD ? DEFAULT_PRODUCTION_API_URL : 'http://localhost:5000';
}

const appConfig: AppConfig = {
  layoutType: LayoutTypes.SimpleSideBar,
  apiURL: resolveApiUrl(),
  apiPrefix: '/v1',
  authenticatedEntryPath: '/main',
  unAuthenticatedEntryPath: '/login',
  enableMock: false,
  locale: 'vi',
};

export default appConfig;