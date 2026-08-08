/** Production hosts often need long-polling when WebSocket is blocked by proxy/CDN. */
export function shouldForceSocketPolling(): boolean {
  if (import.meta.env.VITE_SOCKET_FORCE_POLLING === 'true') return true;
  if (import.meta.env.VITE_SOCKET_FORCE_POLLING === 'false') return false;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host !== 'localhost' && host !== '127.0.0.1';
}
