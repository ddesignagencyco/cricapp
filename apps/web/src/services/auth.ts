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
  SignupResponse,
  UpdateProfileInput,
  VerifyEmailInput,
} from '../types/auth';

/** Cookie session — Bearer headers are unused. Kept so existing call sites compile. */
export function authHeaders(): Record<string, string> {
  return {};
}

export function getAccessToken(): string | null {
  return null;
}

export function clearAccessToken(): void {
  // Session lives in the HttpOnly cookie; nothing to clear locally.
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/login', input);
}

export async function register(input: RegisterInput): Promise<SignupResponse> {
  return apiPost<SignupResponse>('/auth/signup', input);
}

export function forgotPassword(input: ForgotPasswordInput): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/forgot-password', input);
}

export function resetPassword(input: ResetPasswordInput): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/reset-password', {
    tokenId: input.tokenId,
    token: input.token,
    password: input.password,
  });
}

export function verifyEmail(input: VerifyEmailInput): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/verify-email', input);
}

export function resendVerification(input: ResendVerificationInput): Promise<MessageResponse> {
  return apiPost<MessageResponse>('/auth/resend-verification', input);
}

export function getCurrentUser(): Promise<AuthUser> {
  return apiGet<AuthUser>('/auth/me');
}

export function updateProfile(input: UpdateProfileInput): Promise<AuthUser> {
  return apiPatch<AuthUser>('/auth/me', input);
}

export async function logout(): Promise<void> {
  try {
    await apiPost<MessageResponse>('/auth/logout');
  } catch {
    // Cookie may already be gone.
  }
}
