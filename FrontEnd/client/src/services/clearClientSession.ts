import store, { persistor } from '@/store';
import { clearAuthState } from '@/store/authSlice';

/**
 * Xóa session khỏi localStorage + redux-persist (persist:root).
 * Pause persist trước khi clear để tránh race: refreshAuthFromStorage đọc persist và khôi phục token.
 */
export async function clearClientSession(): Promise<void> {
  persistor.pause();
  store.dispatch(clearAuthState());
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_email');
  localStorage.removeItem('first_login');
  localStorage.removeItem('persist:root');
  await persistor.flush();
  await persistor.purge();
  persistor.persist();
  window.dispatchEvent(new Event('auth-change'));
}
