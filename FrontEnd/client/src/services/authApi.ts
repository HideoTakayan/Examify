import apiClient from './apiClient';
import { clearClientSession } from './clearClientSession';
import { setVoluntaryLogout } from './voluntaryLogout';
import { markLoginGrace } from './loginGrace';
import { persistor } from '@/store';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserInfo {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  full_name: string | null;
  is_active: boolean;
  first_login?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
  deviceId: string;
  hasExistingSession: boolean;
}

const ACCESS_TOKEN_KEY = 'access_token';
const DEVICE_ID_KEY = 'device_id';

export const getDeviceId = (): string => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const login = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const deviceId = getDeviceId();
  const deviceInfo = navigator.userAgent;
  const res = await apiClient.post<{ success: boolean; data: LoginResponse }>(
    '/auth/login',
    { email, password, device_id: deviceId, device_info: deviceInfo }
  );
  return res.data.data;
};

/**
 * Chỉ gọi khi đã đăng nhập **admin** (token gắn tự động).
 * Sinh viên / giảng viên không tự đăng ký qua UI — tài khoản do admin tạo.
 */
export const registerUserAsAdmin = async (
  email: string,
  username: string,
  password: string,
  role: UserRole,
  full_name?: string
): Promise<UserInfo> => {
  const res = await apiClient.post<{ success: boolean; data: UserInfo }>(
    '/auth/register',
    { email, username, password, role, full_name }
  );
  return res.data.data;
};

export interface SessionInfo {
  valid: boolean;
  userId: string;
  role: UserRole;
  first_login?: boolean;
  requires_password_change?: boolean;
}

export const saveSession = async (token: string, user: UserInfo) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem('user_id', user.id);
  localStorage.setItem('user_role', user.role);
  localStorage.setItem('user_name', user.full_name || user.username);
  localStorage.setItem('user_email', user.email);
  markLoginGrace();
  window.dispatchEvent(new Event('auth-change'));
  await persistor.flush();
};

/** Trạng thái phiên từ server — không tin localStorage cho first_login. */
export const fetchSession = async (): Promise<SessionInfo> => {
  const res = await apiClient.get<{ success: boolean; data: SessionInfo }>('/auth/session');
  return res.data.data;
};

export const logout = async (): Promise<void> => {
  setVoluntaryLogout(true);
  try {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      /* vẫn xóa client nếu server lỗi hoặc token đã hết hạn */
    }
    await clearClientSession();
  } finally {
    window.setTimeout(() => setVoluntaryLogout(false), 2500);
  }
};

export const clearSession = (): Promise<void> => logout();

export const checkServerSession = async (): Promise<boolean> => {
  try {
    await apiClient.get('/auth/session');
    return true;
  } catch {
    return false;
  }
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ token?: string; user?: UserInfo }> => {
  const res = await apiClient.patch<{
    success: boolean;
    data: { token?: string; user?: UserInfo; first_login?: boolean };
  }>(`/users/${userId}/password`, {
    current_password: currentPassword,
    new_password: newPassword,
    device_id: getDeviceId(),
    device_info: navigator.userAgent,
  });
  const data = res.data.data;
  if (data.token && data.user) {
    await saveSession(data.token, data.user);
  }
  return data;
};

export interface PasswordResetRequestItem {
  id: string;
  user_id: string;
  requested_by: string;
  status: "pending" | "approved" | "rejected" | "expired";
  admin_note: string | null;
  approved_by: string | null;
  expires_at: string;
  created_at: string;
  user_full_name: string | null;
  user_email: string;
  requested_by_full_name: string | null;
  approved_by_full_name: string | null;
}

export const getMyPasswordResetRequests = async (): Promise<PasswordResetRequestItem[]> => {
  const res = await apiClient.get<{ success: boolean; data: PasswordResetRequestItem[] }>(
    "/password-reset/me"
  );
  return res.data.data;
};

/** Đã đăng nhập: gửi yêu cầu đặt lại MK lên admin (tab Cài đặt tài khoản). */
export const submitMyPasswordResetRequest = async (): Promise<{ requestId: string; message: string }> => {
  const res = await apiClient.post<{
    success: boolean;
    message: string;
    data: { requestId: string };
  }>("/password-reset/me");
  return {
    requestId: res.data.data.requestId,
    message: res.data.message || "Yêu cầu đã được gửi lên quản trị viên. Vui lòng chờ xử lý.",
  };
};

export const requestSelfPasswordReset = async (email: string): Promise<{ requestId: string }> => {
  const res = await apiClient.post<{ success: boolean; data: { requestId: string } }>(
    "/password-reset/self",
    { email }
  );
  return res.data.data;
};

// Manual admin-approval password reset (Task 6): student submits request → admin approves → email sent
export const forgotPassword = async (email: string): Promise<{ requestId: string; message: string }> => {
  const res = await apiClient.post<{ success: boolean; data: { requestId: string }; message: string }>(
    "/password-reset/self",
    { email }
  );
  return { requestId: res.data.data.requestId, message: res.data.message || "Yêu cầu đã được gửi. Vui lòng chờ quản trị viên xử lý." };
};

// Self-service email-based reset password (Task 6)
export const resetPassword = async (token: string, password: string): Promise<void> => {
  await apiClient.post("/auth/reset-password", { token, password });
};

export const getPendingPasswordResets = async (params?: {
  limit?: number;
  offset?: number;
}): Promise<PasswordResetRequestItem[]> => {
  const res = await apiClient.get<{ success: boolean; data: unknown }>(
    "/password-reset/pending",
    { params }
  );
  const body = res.data.data;
  if (Array.isArray(body)) return body as PasswordResetRequestItem[];
  return (body as { items: PasswordResetRequestItem[] }).items ?? [];
};

export const createPasswordResetRequest = async (userId: string): Promise<{ requestId: string }> => {
  const res = await apiClient.post<{ success: boolean; data: { requestId: string } }>(
    "/password-reset",
    { user_id: userId }
  );
  return res.data.data;
};

export const approvePasswordReset = async (
  requestId: string,
  adminNote?: string
): Promise<{ tempPassword: string }> => {
  const res = await apiClient.post<{ success: boolean; data: { tempPassword: string } }>(
    "/password-reset/approve",
    { request_id: requestId, admin_note: adminNote }
  );
  return res.data.data;
};

export const rejectPasswordReset = async (
  requestId: string,
  adminNote?: string
): Promise<void> => {
  await apiClient.post("/password-reset/reject", {
    request_id: requestId,
    admin_note: adminNote,
  });
};