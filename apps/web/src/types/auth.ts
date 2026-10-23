export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface ForgotPasswordInput {
  email: string;
}

/** The link pair from the email (`tid` + `token`), or the 6-digit code typed with the email. */
export type EmailProof = { tokenId: string; token: string } | { email: string; code: string };

export type ResetPasswordInput = EmailProof & { password: string };

export type VerifyEmailInput = EmailProof;

export interface ResendVerificationInput {
  email: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
  username?: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface SignupResponse {
  message: string;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
}
