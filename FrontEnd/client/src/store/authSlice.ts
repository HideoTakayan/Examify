import { createSlice } from '@reduxjs/toolkit';

export type FrontendRole = 'admin' | 'teacher' | 'student';

type AuthState = {
  authenticated: boolean;
  userRole: FrontendRole;
  accessToken: string | null;
  userName: string | null;
  userEmail: string | null;
};

const ACCESS_TOKEN_KEY = 'access_token';
const PERSIST_ROOT_KEY = 'persist:root';
const USER_ROLE_KEY = 'user_role';
const USER_NAME_KEY = 'user_name';
const USER_EMAIL_KEY = 'user_email';

type PersistedAuthState = Partial<AuthState> & {
  accessToken?: string | null;
  userRole?: FrontendRole | null;
  userName?: string | null;
  userEmail?: string | null;
};

function readPersistedAuth(): PersistedAuthState | null {
  const raw = localStorage.getItem(PERSIST_ROOT_KEY);
  if (!raw) return null;
  try {
    const root = JSON.parse(raw) as { auth?: string };
    if (!root.auth) return null;
    return JSON.parse(root.auth) as PersistedAuthState;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) return true;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const exp = typeof decoded.exp === 'number' ? decoded.exp : null;
    if (!exp) return false;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

function syncAuthStorageFromPersist(): void {
  if (localStorage.getItem(ACCESS_TOKEN_KEY)) return;

  const persisted = readPersistedAuth();
  if (!persisted?.accessToken) return;
  if (isJwtExpired(persisted.accessToken)) return;

  localStorage.setItem(ACCESS_TOKEN_KEY, persisted.accessToken);
  if (persisted.userRole) localStorage.setItem(USER_ROLE_KEY, persisted.userRole);
  if (persisted.userName) localStorage.setItem(USER_NAME_KEY, persisted.userName);
  if (persisted.userEmail) localStorage.setItem(USER_EMAIL_KEY, persisted.userEmail);

  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function resolveRoleFromStorage(): FrontendRole {
  const role = localStorage.getItem(USER_ROLE_KEY);
  if (role === 'admin') return 'admin';
  if (role === 'teacher') return 'teacher';
  return 'student';
}

function readAuthStateFromStorage(): AuthState {
  syncAuthStorageFromPersist();
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  return {
    authenticated: Boolean(accessToken),
    userRole: resolveRoleFromStorage(),
    accessToken,
    userName: localStorage.getItem(USER_NAME_KEY),
    userEmail: localStorage.getItem(USER_EMAIL_KEY),
  };
}

const initialState: AuthState = readAuthStateFromStorage();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    refreshAuthFromStorage: () => readAuthStateFromStorage(),
    clearAuthState: () => ({
      authenticated: false,
      userRole: 'student' as FrontendRole,
      accessToken: null,
      userName: null,
      userEmail: null,
    }),
  },
});

export const { refreshAuthFromStorage, clearAuthState } = authSlice.actions;
export default authSlice.reducer;
