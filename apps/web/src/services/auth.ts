import { ApiError, apiGet, apiPost, apiPatch } from './api/client';
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

/** Existing upload API when allowed; otherwise a compressed data URL for PATCH /auth/me. */
export async function uploadProfileImage(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  try {
    const uploaded = await apiPost<{ url: string }>('/admin/media/upload', body);
    return uploaded.url;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return fileToCompressedDataUrl(file);
    }
    throw error;
  }
}

function fileToCompressedDataUrl(file: File, maxPx = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not read the image.'));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read the image.'));
    };
    image.src = objectUrl;
  });
  }

export async function logout(): Promise<void> {
  try {
    await apiPost<MessageResponse>('/auth/logout');
  } catch {
    // Cookie may already be gone.
  }
}
