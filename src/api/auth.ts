import { api } from './client';

/** Shapes returned by cric_info/apps/api/src/auth (see dto/auth.dto.ts). */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  emailVerified: boolean;
}

export interface UserProfile extends AuthUser {
  createdAt: string;
}

interface MessageResponse {
  message: string;
}

export interface SignupPayload {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

/**
 * The API authenticates with an HttpOnly cookie set by POST /auth/login;
 * the native networking stack stores and resends it (see api/client.ts).
 * Verification and password reset use the 6-digit code from the email
 * (email + code); the same email also carries a link for the website.
 */
export const authApi = {
  signup: (payload: SignupPayload) => api.post<MessageResponse & { user: AuthUser }>('/auth/signup', payload),
  login: (email: string, password: string) => api.post<{ user: AuthUser }>('/auth/login', { email, password }),
  logout: () => api.post<MessageResponse>('/auth/logout'),
  // Short timeout: this runs on every launch.
  me: () => api.get<UserProfile>('/auth/me', undefined, 6000),
  forgotPassword: (email: string) => api.post<MessageResponse>('/auth/forgot-password', { email }),
  resendVerification: (email: string) => api.post<MessageResponse>('/auth/resend-verification', { email }),
  verifyEmail: (email: string, code: string) => api.post<MessageResponse>('/auth/verify-email', { email, code }),
  resetPassword: (email: string, code: string, password: string) =>
    api.post<MessageResponse>('/auth/reset-password', { email, code, password }),
  updateMe: (changes: { displayName?: string; username?: string }) => api.patch<UserProfile>('/auth/me', changes),
};
