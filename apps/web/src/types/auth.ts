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

export interface ResetPasswordInput {
  tokenId: string;
  token: string;
  password: string;
}

export interface VerifyEmailInput {
  tokenId: string;
  token: string;
}

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
