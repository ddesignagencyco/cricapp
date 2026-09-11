import { apiGet, apiPost, apiPatch } from './api/client';
import type {
  AuthResponse,
  AuthUser,
  ForgotPasswordInput,
  LoginInput,
  MessageResponse,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from '../types/auth';

const TOKEN_KEY = 'pak-criczone-access-token';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function getAccessToken(): string | null {
  return canUseStorage() ? window.localStorage.getItem(TOKEN_KEY) : null;
}

function saveAccessToken(token: string): void {
  if (canUseStorage()) window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (canUseStorage()) window.localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const response = await apiPost<AuthResponse>('/auth/login', input);
  saveAccessToken(response.access_token);
  return response;
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const response = await apiPost<AuthResponse>('/auth/signup', input);
  saveAccessToken(response.access_token);
  return response;
}

export function forgotPassword(input: ForgotPasswordInput): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/forgot-password', input);
}

export function resetPassword(input: ResetPasswordInput): Promise<MessageResponse> {
  const body: Record<string, string> = { password: input.password };
  if (input.tokenId) body.tokenId = input.tokenId;
  if (input.token) body.token = input.token;
  if (input.email) body.email = input.email;
  if (input.code) body.code = input.code;
  return apiPost<MessageResponse>('/auth/reset-password', body);
}

export function verifyEmail(input: VerifyEmailInput): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/verify-email', input);
}

export function resendVerification(input: ResendVerificationInput): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/resend-verification', input);
}

export function getCurrentUser(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me', undefined, { headers: authHeaders() });
}

export function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  return apiPatch<AuthUser>('/auth/me', input, { headers: authHeaders() });
}

export function logout(): void {
  clearAccessToken();
}
