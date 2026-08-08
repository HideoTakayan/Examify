import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CHUNK_RELOAD_KEY = 'vite-chunk-reload';

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('MIME type') ||
    message.includes('text/html')
  );
}

/** Lazy route: tự reload một lần khi chunk cũ sau deploy không còn trên CDN. */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((error: unknown) => {
      if (isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      throw error;
    })
  );
}

export function clearChunkReloadFlag(): void {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}
