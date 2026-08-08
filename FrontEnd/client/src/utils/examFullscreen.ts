/** Bật toàn màn hình trong cùng user gesture (click "Làm bài"). Trả về true nếu đã fullscreen. */
export async function requestExamFullscreen(): Promise<boolean> {
  if (import.meta.env.DEV && import.meta.env.VITE_DISABLE_INTEGRITY === 'true') {
    return true;
  }
  if (document.fullscreenElement) return true;

  const el = document.documentElement;
  const req =
    el.requestFullscreen?.bind(el) ??
    (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
      .webkitRequestFullscreen?.bind(el);
  if (!req) return false;

  try {
    await req();
    return Boolean(document.fullscreenElement);
  } catch {
    return false;
  }
}
